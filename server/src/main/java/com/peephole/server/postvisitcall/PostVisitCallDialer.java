package com.peephole.server.postvisitcall;

import com.peephole.server.visit.EndedVisit;
import com.peephole.server.vonage.VoiceCallException;
import com.peephole.server.vonage.VoiceCaller;
import java.time.Clock;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// Calls Vonage outside any transaction: each visit's row is committed by PostVisitCallService.claim first, so a slow
// Vonage holds no database connection and the webhooks always find the row
@Component
class PostVisitCallDialer {

    private static final Logger LOGGER = LoggerFactory.getLogger(PostVisitCallDialer.class);
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
    private static final LocalTime FIRST_CALL = LocalTime.of(9, 0);
    private static final LocalTime LAST_CALL = LocalTime.of(21, 0);

    private final PostVisitCallService service;
    private final VoiceCaller voiceCaller;
    private final PostVisitCallWebhookUrls webhookUrls;
    private final Clock clock;

    PostVisitCallDialer(
            PostVisitCallService service, VoiceCaller voiceCaller, PostVisitCallWebhookUrls webhookUrls, Clock clock) {
        this.service = service;
        this.voiceCaller = voiceCaller;
        this.webhookUrls = webhookUrls;
        this.clock = clock;
    }

    void callDueVisits() {
        OffsetDateTime now = OffsetDateTime.now(clock);
        boolean withinCallingHours = withinCallingHours(now);
        for (EndedVisit visit : service.dueVisits(now)) {
            if (withinCallingHours) {
                service.claim(visit.id(), PostVisitCallStatus.CALLING).ifPresent(callId -> call(visit, callId));
            } else {
                service.claim(visit.id(), PostVisitCallStatus.SKIPPED)
                        .ifPresent(callId -> LOGGER.info(
                                "Skipped post-visit call {} for visit {}: outside calling hours", callId, visit.id()));
            }
        }
    }

    private void call(EndedVisit visit, long callId) {
        try {
            String callUuid = voiceCaller.callAndAskForOneKey(
                    visit.visitorPhone(),
                    PostVisitCallTexts.QUESTION,
                    webhookUrls.key(callId),
                    webhookUrls.event(callId));
            service.recordCallStarted(callId, callUuid);
            LOGGER.info("Placed post-visit call {} for visit {}", callId, visit.id());
        } catch (VoiceCallException exception) {
            service.recordCallFailed(callId);
            LOGGER.warn("Post-visit call {} for visit {} failed: {}", callId, visit.id(), exception.getMessage());
        }
    }

    // From 09:00, included, to 21:00, excluded, in Madrid
    private static boolean withinCallingHours(OffsetDateTime now) {
        LocalTime time = now.atZoneSameInstant(MADRID).toLocalTime();
        return !time.isBefore(FIRST_CALL) && time.isBefore(LAST_CALL);
    }
}
