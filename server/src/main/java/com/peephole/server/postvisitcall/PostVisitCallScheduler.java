package com.peephole.server.postvisitcall;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Only with VOICE_CALLS_ENABLED=true, so local development and the tests never place a call
@Component
@ConditionalOnBooleanProperty("app.voice.calls-enabled")
class PostVisitCallScheduler {

    private final PostVisitCallDialer dialer;

    PostVisitCallScheduler(PostVisitCallDialer dialer) {
        this.dialer = dialer;
    }

    @Scheduled(fixedDelay = 60_000)
    void callDueVisits() {
        dialer.callDueVisits();
    }
}
