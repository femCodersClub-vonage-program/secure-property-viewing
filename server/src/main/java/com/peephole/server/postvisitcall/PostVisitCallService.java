package com.peephole.server.postvisitcall;

import com.peephole.server.visit.AgencyVisit;
import com.peephole.server.visit.EndedVisit;
import com.peephole.server.visit.VisitService;
import com.peephole.server.vonage.VoiceWebhookReader.CallEvent;
import com.peephole.server.vonage.VoiceWebhookReader.KeyInput;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostVisitCallService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PostVisitCallService.class);

    // A redeploy never calls about old visits
    private static final Duration LOOK_BACK = Duration.ofHours(2);

    private static final Set<String> NOT_REACHED_EVENTS =
            Set.of("busy", "unanswered", "rejected", "failed", "timeout", "cancelled", "machine");

    private final PostVisitCallRepository repository;
    private final JdbcClient jdbcClient;
    private final VisitService visitService;
    private final Duration callDelay;
    private final Clock clock;

    PostVisitCallService(
            PostVisitCallRepository repository,
            JdbcClient jdbcClient,
            VisitService visitService,
            @Value("${app.voice.call-delay-minutes}") long callDelayMinutes,
            Clock clock) {
        this.repository = repository;
        this.jdbcClient = jdbcClient;
        this.visitService = visitService;
        this.callDelay = Duration.ofMinutes(callDelayMinutes);
        this.clock = clock;
        // A delay as long as the look-back would leave no visit to call, without any error to notice it by
        if (callDelay.isNegative() || callDelay.compareTo(LOOK_BACK) >= 0) {
            throw new IllegalStateException("POST_VISIT_CALL_DELAY_MINUTES must be from 0 to "
                    + (LOOK_BACK.toMinutes() - 1) + ". Check it as explained in docs/setup.md");
        }
    }

    /** The visits whose call is due at {@code now}: ended at least the call delay ago, and at most 2 hours ago. */
    @Transactional(readOnly = true)
    List<EndedVisit> dueVisits(OffsetDateTime now) {
        return visitService.joinedVisitsEndedBetween(now.minus(LOOK_BACK), now.minus(callDelay));
    }

    /**
     * Inserts the visit's only call row with {@code status}, and commits it before anyone calls Vonage, so the
     * webhooks always find it. Empty when the visit already has one, such as when two checks run at once.
     */
    @Transactional
    Optional<Long> claim(long visitId, PostVisitCallStatus status) {
        return jdbcClient
                .sql("""
                        INSERT INTO post_visit_call (visit_id, status, created_at)
                        VALUES (:visitId, :status, :createdAt)
                        ON CONFLICT (visit_id) DO NOTHING
                        RETURNING id
                        """)
                .param("visitId", visitId)
                .param("status", status.name())
                .param("createdAt", OffsetDateTime.now(clock))
                .query(Long.class)
                .optional();
    }

    @Transactional
    void recordCallStarted(long callId, String callUuid) {
        lock(callId).ifPresent(call -> call.started(callUuid));
    }

    @Transactional
    void recordCallFailed(long callId) {
        lock(callId).ifPresent(PostVisitCall::failed);
    }

    /**
     * Records the key the first time and returns the closing sentence for it. A repeat returns the same sentence
     * and changes nothing, and a late key still records the answer on a call marked {@code NOT_REACHED} or
     * {@code FAILED}.
     */
    @Transactional
    String recordKey(long callId, KeyInput input) {
        // Vonage may leave out the uuid when the key times out; the callId we put in the eventUrl still names the call
        Optional<PostVisitCall> found =
                lock(callId).filter(call -> input.callUuid() == null || call.belongsTo(input.callUuid()));
        if (found.isEmpty()) {
            LOGGER.warn("Ignored a key for post-visit call {}, which doesn't match any call", callId);
            return PostVisitCallTexts.NO_VALID_KEY;
        }
        PostVisitCall call = found.get();
        switch (call.getStatus()) {
            // A signed key proves the call reached the visitor, even when Vonage's answer to the call never arrived
            case CALLING, NOT_REACHED, FAILED -> {
                call.answered(PostVisitCallAnswer.fromKey(input.digits()), OffsetDateTime.now(clock));
                LOGGER.info("Recorded the answer of post-visit call {} for visit {}", callId, call.getVisitId());
            }
            case ANSWERED -> LOGGER.info("Post-visit call {} already has its answer", callId);
            case SKIPPED -> {
                LOGGER.warn("Ignored a key for post-visit call {}, which was never placed", callId);
                return PostVisitCallTexts.NO_VALID_KEY;
            }
        }
        return PostVisitCallTexts.closing(call.getAnswer());
    }

    /** Marks a call that never reached the visitor. Any other event, and any call already final, is left as is. */
    @Transactional
    void recordEvent(long callId, CallEvent event) {
        Optional<PostVisitCall> found = lock(callId).filter(call -> call.belongsTo(event.callUuid()));
        if (found.isEmpty()) {
            LOGGER.warn("Ignored an event for post-visit call {}, which doesn't match any call", callId);
            return;
        }
        PostVisitCall call = found.get();
        boolean notReached = NOT_REACHED_EVENTS.contains(event.status()) || "completed".equals(event.status());
        if (call.getStatus() == PostVisitCallStatus.CALLING && notReached) {
            call.notReached();
            LOGGER.info("Post-visit call {} for visit {} didn't reach the visitor", callId, call.getVisitId());
        }
    }

    /**
     * The agency's visits whose visitor answered that someone asked for money, with the answer received after
     * {@code since}, newest first and at most {@code limit}.
     */
    @Transactional(readOnly = true)
    public List<PostVisitCallAlert> recentAlerts(long agencyId, OffsetDateTime since, int limit) {
        // Every recent "yes" of every agency, which stays small: one call per visit and only the last days
        List<PostVisitCall> answers = repository.findAskedForMoneySince(since);
        Map<Long, AgencyVisit> visits =
                visitService
                        .agencyVisitsAmong(
                                agencyId,
                                answers.stream().map(PostVisitCall::getVisitId).toList())
                        .stream()
                        .collect(Collectors.toMap(AgencyVisit::id, Function.identity()));
        return answers.stream()
                .filter(call -> visits.containsKey(call.getVisitId()))
                .limit(limit)
                .map(call -> toAlert(call, visits.get(call.getVisitId())))
                .toList();
    }

    private Optional<PostVisitCall> lock(long callId) {
        return repository.findWithLockById(callId);
    }

    private static PostVisitCallAlert toAlert(PostVisitCall call, AgencyVisit visit) {
        return new PostVisitCallAlert(
                visit.id(), visit.visitorName(), visit.propertyTitle(), visit.startsAt(), call.getAnsweredAt());
    }
}
