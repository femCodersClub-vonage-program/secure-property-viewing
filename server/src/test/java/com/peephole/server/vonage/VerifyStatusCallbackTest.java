package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class VerifyStatusCallbackTest {

    private static final String REQUEST_ID = "c11236f4-00bf-4b89-84ba-88b25df97315";

    @Test
    void readsTheRequestIdAndTheStatus() {
        assertThat(VerifyStatusCallback.fromJson(body("user_rejected")))
                .contains(new VerifyStatusCallback(REQUEST_ID, VerifyCallbackStatus.USER_REJECTED));
    }

    @ParameterizedTest
    @CsvSource({"completed, COMPLETED", "failed, FAILED", "expired, EXPIRED", "action_pending, OTHER"})
    void readsEachStatus(String status, VerifyCallbackStatus expected) {
        assertThat(VerifyStatusCallback.fromJson(body(status)))
                .map(VerifyStatusCallback::status)
                .contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not json", "{}", "{\"status\":\"expired\"}"})
    void isEmptyWhenTheBodyCannotBeRead(String body) {
        assertThat(VerifyStatusCallback.fromJson(body)).isEmpty();
    }

    private static String body(String status) {
        return "{\"request_id\":\"" + REQUEST_ID + "\",\"status\":\"" + status + "\"}";
    }
}
