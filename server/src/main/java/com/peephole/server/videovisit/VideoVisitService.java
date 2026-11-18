package com.peephole.server.videovisit;

import com.peephole.server.videovisit.dto.RoomLinkResponse;
import com.peephole.server.videovisit.dto.VideoTokenResponse;
import com.peephole.server.visit.BookedVisit;
import com.peephole.server.visit.VisitService;
import com.peephole.server.vonage.VideoProvider;
import com.peephole.server.vonage.VideoProviderException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class VideoVisitService {

    private static final Logger LOGGER = LoggerFactory.getLogger(VideoVisitService.class);
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
    private static final int GUEST_LINK_LIMIT = 4;

    private final VisitService visitService;
    private final VideoAccessRepository accessRepository;
    private final VideoProvider videoProvider;
    private final Clock clock;

    VideoVisitService(
            VisitService visitService,
            VideoAccessRepository accessRepository,
            VideoProvider videoProvider,
            Clock clock) {
        this.visitService = visitService;
        this.accessRepository = accessRepository;
        this.videoProvider = videoProvider;
        this.clock = clock;
    }

    // The visit row stays locked until the end, so two requests never pass the guest limit or create two visitor links
    @Transactional
    RoomLinkResponse createRoomLink(long visitId, VideoRole role) {
        BookedVisit visit = visitService.lock(visitId).orElseThrow(VideoVisitNotFoundException::new);
        Instant now = clock.instant();
        if (!visit.confirmed() || RoomWindow.of(visit).hasClosed(now)) {
            throw VideoVisitNotOpenException.over();
        }

        if (role == VideoRole.VISITOR) {
            accessRepository.deleteByVisitIdAndRole(visitId, VideoRole.VISITOR);
        } else if (accessRepository.countByVisitIdAndRole(visitId, VideoRole.GUEST) >= GUEST_LINK_LIMIT) {
            throw new VideoInviteLimitReachedException(GUEST_LINK_LIMIT);
        }

        String token = RoomToken.generate();
        accessRepository.save(new VideoAccess(visitId, role, RoomToken.hash(token), OffsetDateTime.now(clock)));
        return new RoomLinkResponse(role.name(), token);
    }

    @Transactional
    VideoTokenResponse videoTokenForRoomLink(String roomToken) {
        VideoAccess access =
                accessRepository.findByTokenHash(RoomToken.hash(roomToken)).orElseThrow(RoomLinkNotFoundException::new);
        BookedVisit visit = visitService.lock(access.getVisitId()).orElseThrow(RoomLinkNotFoundException::new);
        return enter(visit, access.getRole());
    }

    @Transactional
    VideoTokenResponse videoTokenForAgency(long visitId, long agencyId) {
        BookedVisit visit = visitService
                .lock(visitId)
                .filter(found -> found.agencyId() == agencyId)
                .orElseThrow(VideoVisitNotFoundException::new);
        return enter(visit, VideoRole.AGENCY);
    }

    private VideoTokenResponse enter(BookedVisit visit, VideoRole role) {
        Instant now = clock.instant();
        RoomWindow window = RoomWindow.of(visit);
        if (!visit.confirmed() || window.hasClosed(now)) {
            throw VideoVisitNotOpenException.over();
        }
        if (!window.hasOpened(now)) {
            throw VideoVisitNotOpenException.notYet(inMadrid(window.opensAt()), RoomWindow.OPENS_BEFORE);
        }

        String sessionId = visitService.videoSessionId(visit.id(), () -> createSession(visit.id()));
        String token =
                videoProvider.generateToken(sessionId, "role=" + role.name(), Duration.between(now, window.closesAt()));
        return new VideoTokenResponse(
                videoProvider.applicationId(), sessionId, token, role.name(), inMadrid(window.closesAt()));
    }

    private String createSession(long visitId) {
        try {
            String sessionId = videoProvider.createSession();
            LOGGER.info("Created the video session of visit {}", visitId);
            return sessionId;
        } catch (VideoProviderException exception) {
            // Adds the visit id to the error that RestExceptionHandler logs. The cause carries nothing from Vonage
            throw new IllegalStateException("Could not create the video session of visit " + visitId, exception);
        }
    }

    private static OffsetDateTime inMadrid(Instant instant) {
        return instant.atZone(MADRID).toOffsetDateTime();
    }
}
