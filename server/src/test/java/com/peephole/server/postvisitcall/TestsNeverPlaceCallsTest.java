package com.peephole.server.postvisitcall;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

// server/.env can turn the calls on to try them locally, and the tests read it too
@SpringBootTest
class TestsNeverPlaceCallsTest {

    @Autowired
    private ApplicationContext context;

    @Value("${app.voice.calls-enabled}")
    private boolean callsEnabled;

    @Test
    void keepsCallsOffEvenWhenServerEnvTurnsThemOn() {
        assertThat(callsEnabled).isFalse();
        assertThat(context.getBeanNamesForType(PostVisitCallScheduler.class)).isEmpty();
    }
}
