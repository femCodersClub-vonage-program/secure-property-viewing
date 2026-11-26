package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.DirtiesContext;

// Turns sending on as server/.env would, so the test fails on every machine if the test configuration stops
// keeping it off. Its context is closed afterwards, so it doesn't hold database connections for the rest of the run
@SpringBootTest(properties = "MESSAGES_SENDING_ENABLED=true")
@DirtiesContext
class TestsNeverSendMessagesTest {

    @Autowired
    private ApplicationContext context;

    @Value("${app.messages.sending-enabled}")
    private boolean sendingEnabled;

    @Test
    void keepsSendingOffEvenWhenServerEnvTurnsItOn() {
        assertThat(sendingEnabled).isFalse();
        assertThat(context.getBeanNamesForType(MessageScheduler.class)).isEmpty();
    }
}
