package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SmsStepResult;
import com.peephole.server.vonage.VerifyCallbackStatus;
import com.peephole.server.vonage.VerifyCallbackType;
import com.peephole.server.vonage.VerifyStatusCallback;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VerifyStatusCallbackServiceTest {

    private static final String REQUEST_ID = "request-1";
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-23T10:01:00Z");
    // One minute before NOW, so the verification has not expired yet
    private static final OffsetDateTime CREATED_AT = NOW.minusMinutes(1);

    @Mock
    private PhoneVerificationRepository repository;

    @Mock
    private PhoneVerifier phoneVerifier;

    private VerifyStatusCallbackService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW.toInstant(), ZoneOffset.UTC);
        service = new VerifyStatusCallbackService(repository, phoneVerifier, clock);
    }

    // Events about the silent step

    @Test
    void movesARealNumberOnToSmsWhenTheSilentCheckIsRejected() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        service.handle(silentEvent(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
    }

    @Test
    void movesARealNumberOnToSmsWhenTheSilentCheckFails() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        service.handle(silentEvent(VerifyCallbackStatus.FAILED));

        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
    }

    @Test
    void expiresWhenVonageHasAlreadyEndedTheRequest() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.ENDED);

        service.handle(silentEvent(VerifyCallbackStatus.FAILED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
    }

    @Test
    void failsAVerificationWithoutAnSmsStepWhenTheSilentCheckIsRejected() {
        PhoneVerification verification = silentVerification(false, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
        verify(phoneVerifier, never()).moveToSms(any());
    }

    // Vonage may send expired for the silent step alone and go on with the SMS by itself
    @Test
    void keepsARealNumberPendingOnSmsWhenOnlyTheSilentStepExpires() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void expiresAVerificationWithoutAnSmsStepWhenTheSilentStepExpires() {
        PhoneVerification verification = silentVerification(false, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
    }

    @Test
    void changesNothingWhenTheSilentCheckCompletes() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.COMPLETED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SILENT_AUTH);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void ignoresAnEventAboutTheSmsStep() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(
                new VerifyStatusCallback(REQUEST_ID, VerifyCallbackType.EVENT, "sms", VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void leavesAVerificationOnSmsAsItIs() {
        PhoneVerification verification =
                new PhoneVerification(PhoneVerificationPurpose.VISIT, "phone-hash", REQUEST_ID, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        verifyNoInteractions(phoneVerifier);
    }

    // Summaries of the whole request

    @Test
    void expiresTheVerificationWhenTheWholeRequestExpires() {
        PhoneVerification verification =
                new PhoneVerification(PhoneVerificationPurpose.VISIT, "phone-hash", REQUEST_ID, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(summary(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void failsTheVerificationWhenTheWholeRequestFails() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(summary(VerifyCallbackStatus.FAILED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
    }

    @Test
    void changesNothingWhenTheWholeRequestCompletes() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(summary(VerifyCallbackStatus.COMPLETED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
    }

    // Any callback

    @Test
    void expiresAVerificationOlderThanFiveMinutesWithoutCallingVonage() {
        PhoneVerification verification = silentVerification(true, NOW.minusMinutes(5));
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(silentEvent(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void leavesAVerifiedVerificationAsItIs() {
        PhoneVerification verification = silentVerification(true, CREATED_AT);
        verification.markVerified(CREATED_AT.plusSeconds(20));
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(summary(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.VERIFIED);
    }

    @Test
    void ignoresACallbackForAnUnknownRequest() {
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.empty());

        service.handle(silentEvent(VerifyCallbackStatus.USER_REJECTED));

        verifyNoInteractions(phoneVerifier);
    }

    private static VerifyStatusCallback silentEvent(VerifyCallbackStatus status) {
        return new VerifyStatusCallback(REQUEST_ID, VerifyCallbackType.EVENT, "silent_auth", status);
    }

    private static VerifyStatusCallback summary(VerifyCallbackStatus status) {
        return new VerifyStatusCallback(REQUEST_ID, VerifyCallbackType.SUMMARY, null, status);
    }

    private static PhoneVerification silentVerification(boolean smsFallback, OffsetDateTime createdAt) {
        return new PhoneVerification(
                PhoneVerificationPurpose.VISIT,
                "phone-hash",
                REQUEST_ID,
                createdAt,
                PhoneVerificationChannel.SILENT_AUTH,
                smsFallback);
    }
}
