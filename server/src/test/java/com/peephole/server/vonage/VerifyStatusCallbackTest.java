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
    void readsAnEventAboutTheSilentStep() {
        assertThat(VerifyStatusCallback.fromJson(event("silent_auth", "user_rejected")))
                .contains(new VerifyStatusCallback(
                        REQUEST_ID, VerifyCallbackType.EVENT, "silent_auth", VerifyCallbackStatus.USER_REJECTED));
    }

    @Test
    void tellsAnEventAboutTheSilentStepFromOneAboutSms() {
        assertThat(VerifyStatusCallback.fromJson(event("silent_auth", "expired")))
                .hasValueSatisfying(
                        callback -> assertThat(callback.isSilentAuthEvent()).isTrue());
        assertThat(VerifyStatusCallback.fromJson(event("sms", "expired")))
                .hasValueSatisfying(
                        callback -> assertThat(callback.isSilentAuthEvent()).isFalse());
    }

    @Test
    void readsASummaryOfTheWholeRequest() {
        assertThat(VerifyStatusCallback.fromJson(summary("expired"))).hasValueSatisfying(callback -> {
            assertThat(callback.type()).isEqualTo(VerifyCallbackType.SUMMARY);
            assertThat(callback.status()).isEqualTo(VerifyCallbackStatus.EXPIRED);
            assertThat(callback.isSilentAuthEvent()).isFalse();
        });
    }

    @ParameterizedTest
    @CsvSource({"completed, COMPLETED", "failed, FAILED", "expired, EXPIRED", "action_pending, OTHER"})
    void readsEachStatus(String status, VerifyCallbackStatus expected) {
        assertThat(VerifyStatusCallback.fromJson(event("silent_auth", status)))
                .map(VerifyStatusCallback::status)
                .contains(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"not json", "{}", "{\"status\":\"expired\"}"})
    void isEmptyWhenTheBodyCannotBeRead(String body) {
        assertThat(VerifyStatusCallback.fromJson(body)).isEmpty();
    }

    // The shape of the event callback in Vonage's Verify documentation
    private static String event(String channel, String status) {
        return "{\"request_id\":\"" + REQUEST_ID + "\",\"triggered_at\":\"2026-11-23T10:00:00.000Z\","
                + "\"type\":\"event\",\"channel\":\"" + channel + "\",\"status\":\"" + status + "\"}";
    }

    // The shape of the summary callback, without its workflow list
    private static String summary(String status) {
        return "{\"request_id\":\"" + REQUEST_ID + "\",\"submitted_at\":\"2026-11-23T10:00:00.000Z\","
                + "\"type\":\"summary\",\"status\":\"" + status + "\"}";
    }
}
