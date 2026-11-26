package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

// server/.env can turn sending on to try it locally, and the tests read it too
@SpringBootTest
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
