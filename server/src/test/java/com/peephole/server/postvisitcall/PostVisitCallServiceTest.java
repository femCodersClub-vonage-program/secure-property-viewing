package com.peephole.server.postvisitcall;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PostVisitCallServiceTest {

    // The check only looks 2 hours back, so a longer delay would never find a visit to call
    @ParameterizedTest
    @ValueSource(longs = {-1, 120, 180})
    void refusesToStartWithADelayOutsideTheLookBack(long minutes) {
        assertThatThrownBy(() -> new PostVisitCallService(null, null, null, minutes, Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("POST_VISIT_CALL_DELAY_MINUTES must be from 0 to 119");
    }
}
