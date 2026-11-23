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
import com.peephole.server.vonage.VerifyStatusCallback;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VerifyStatusCallbackServiceTest {

    private static final String REQUEST_ID = "request-1";
    private static final OffsetDateTime CREATED_AT = OffsetDateTime.parse("2026-11-23T10:00:00Z");

    @Mock
    private PhoneVerificationRepository repository;

    @Mock
    private PhoneVerifier phoneVerifier;

    private VerifyStatusCallbackService service;

    @BeforeEach
    void setUp() {
        service = new VerifyStatusCallbackService(repository, phoneVerifier);
    }

    @Test
    void movesARealNumberOnToSmsWhenTheSilentCheckIsRejected() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        service.handle(callback(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
    }

    @Test
    void movesARealNumberOnToSmsWhenTheSilentCheckFails() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        service.handle(callback(VerifyCallbackStatus.FAILED));

        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
    }

    @Test
    void failsAVerificationWithoutAnSmsStep() {
        PhoneVerification verification = silentVerification(false);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(callback(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void expiresWhenVonageHasAlreadyEndedTheRequest() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.ENDED);

        service.handle(callback(VerifyCallbackStatus.FAILED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
    }

    @Test
    void expiresAPendingVerification() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(callback(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void changesNothingWhenTheSilentCheckCompletes() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(callback(VerifyCallbackStatus.COMPLETED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SILENT_AUTH);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void leavesAVerificationOnSmsAsItIs() {
        PhoneVerification verification =
                new PhoneVerification(PhoneVerificationPurpose.VISIT, "phone-hash", REQUEST_ID, CREATED_AT);
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(callback(VerifyCallbackStatus.USER_REJECTED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        verifyNoInteractions(phoneVerifier);
    }

    @Test
    void leavesAVerifiedVerificationAsItIs() {
        PhoneVerification verification = silentVerification(true);
        verification.markVerified(CREATED_AT.plusSeconds(20));
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.of(verification));

        service.handle(callback(VerifyCallbackStatus.EXPIRED));

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.VERIFIED);
    }

    @Test
    void ignoresACallbackForAnUnknownRequest() {
        when(repository.findWithLockByVonageRequestId(REQUEST_ID)).thenReturn(Optional.empty());

        service.handle(callback(VerifyCallbackStatus.USER_REJECTED));

        verifyNoInteractions(phoneVerifier);
    }

    private static VerifyStatusCallback callback(VerifyCallbackStatus status) {
        return new VerifyStatusCallback(REQUEST_ID, status);
    }

    private static PhoneVerification silentVerification(boolean smsFallback) {
        return new PhoneVerification(
                PhoneVerificationPurpose.VISIT,
                "phone-hash",
                REQUEST_ID,
                CREATED_AT,
                PhoneVerificationChannel.SILENT_AUTH,
                smsFallback);
    }
}
