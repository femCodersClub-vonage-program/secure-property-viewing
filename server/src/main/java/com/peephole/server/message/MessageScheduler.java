package com.peephole.server.message;

import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// Only with MESSAGES_SENDING_ENABLED=true, so local servers and the tests never send a real SMS. Its first run is
// at startup, so messages that were due while the server was down are sent then, within their retry window
@Component
@ConditionalOnBooleanProperty("app.messages.sending-enabled")
class MessageScheduler {

    private final MessageDispatcher dispatcher;
    private final Clock clock;

    MessageScheduler(MessageDispatcher dispatcher, Clock clock) {
        this.dispatcher = dispatcher;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = 60_000)
    void sendDueMessages() {
        dispatcher.sendDueMessages(OffsetDateTime.now(clock));
    }
}
