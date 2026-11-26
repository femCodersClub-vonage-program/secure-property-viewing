package com.peephole.server.postvisitcall;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.annotation.DirtiesContext;

// Turns the calls on as server/.env would, so the test fails on every machine if the test configuration stops
// keeping them off. Its context is closed afterwards, so it doesn't hold database connections for the rest of the run
@SpringBootTest(properties = "VOICE_CALLS_ENABLED=true")
@DirtiesContext
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
