package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.common.FieldValidationException;
import com.peephole.server.phoneverification.dto.PhoneVerificationResponse;
import com.peephole.server.phoneverification.dto.StartPhoneVerificationResponse;
import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.ConcurrentVerificationException;
import com.peephole.server.vonage.PhoneNumberRejectedException;
import com.peephole.server.vonage.PhoneVerifier;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PhoneVerificationServiceTest {

    private static final String PHONE = "+34600000000";
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-13T10:00:00Z");

    @Mock
    private PhoneVerificationRepository repository;

    @Mock
    private PhoneVerifier phoneVerifier;

    private final PhoneHasher phoneHasher = new PhoneHasher("test-secret");

    private PhoneVerificationService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(NOW.toInstant(), ZoneOffset.UTC);
        service = new PhoneVerificationService(repository, phoneVerifier, phoneHasher, clock);
    }

    // Starting a verification

    @Test
    void startsAVerificationAndSavesItAsPending() {
        when(phoneVerifier.start(PHONE)).thenReturn("request-1");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response = service.start(PHONE, PhoneVerificationPurpose.VISIT, null);

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.resendAvailableAt()).isEqualTo(NOW.plusSeconds(30));
        PhoneVerification saved = savedVerification();
        assertThat(saved.getVonageRequestId()).isEqualTo("request-1");
        assertThat(saved.getPhoneHash()).isEqualTo(phoneHasher.hash(PHONE));
        assertThat(saved.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectsAPhoneThatStartedFiveVerificationsInTheLastHour() {
        when(repository.countByPhoneHashAndCreatedAtAfter(phoneHasher.hash(PHONE), NOW.minusHours(1)))
                .thenReturn(5L);

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null))
                .isInstanceOf(VerificationLimitReachedException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsAnyPhoneWhenTheServerStartedThirtyVerificationsInTheLastHour() {
        when(repository.countByCreatedAtAfter(NOW.minusHours(1))).thenReturn(30L);

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null))
                .isInstanceOf(VerificationLimitReachedException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsANewCodeBeforeThirtySeconds() {
        PhoneVerification pending = pendingVerification(NOW.minusSeconds(29));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L))
                .isInstanceOf(VerificationResendTooSoonException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void replacesThePendingVerificationAfterThirtySeconds() {
        PhoneVerification pending = pendingVerification(NOW.minusSeconds(30));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L);

        verify(phoneVerifier).cancel("request-1");
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        assertThat(savedVerification().getVonageRequestId()).isEqualTo("request-2");
    }

    @Test
    void startsANewVerificationAfterThreeWrongCodes() {
        PhoneVerification failed = pendingVerification(NOW.minusMinutes(1));
        failed.markFailed();
        when(repository.findById(1L)).thenReturn(Optional.of(failed));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response = service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L);

        verify(phoneVerifier).cancel("request-1");
        assertThat(failed.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    void asksToWaitAfterThreeQuickWrongCodes() {
        PhoneVerification failed = pendingVerification(NOW.minusSeconds(20));
        failed.markFailed();
        when(repository.findById(1L)).thenReturn(Optional.of(failed));

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L))
                .isInstanceOf(VerificationResendTooSoonException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void keepsAVerifiedVerificationWhenANewOneStarts() {
        PhoneVerification verified = pendingVerification(NOW.minusMinutes(1));
        verified.markVerified(NOW.minusSeconds(30));
        when(repository.findById(1L)).thenReturn(Optional.of(verified));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L);

        verify(phoneVerifier, never()).cancel(any());
        assertThat(verified.getStatus()).isEqualTo(PhoneVerificationStatus.VERIFIED);
    }

    @Test
    void reportsAVerificationInProgressFromAnotherSession() {
        when(phoneVerifier.start(PHONE)).thenThrow(new ConcurrentVerificationException());

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null))
                .isInstanceOf(VerificationInProgressException.class);
    }

    @Test
    void reportsANumberVonageCannotSendTo() {
        when(phoneVerifier.start(PHONE)).thenThrow(new PhoneNumberRejectedException());

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null))
                .isInstanceOf(FieldValidationException.class)
                .extracting("field")
                .isEqualTo("phone");
    }

    // Checking a code

    @Test
    void verifiesTheRightCode() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "123456")).thenReturn(CodeCheckResult.MATCHED);

        PhoneVerificationResponse response = service.check(1L, "123456");

        assertThat(response.status()).isEqualTo("VERIFIED");
        assertThat(pending.getVerifiedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectsAWrongCodeAndCountsTheAttempt() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThat(pending.getCheckAttempts()).isEqualTo((short) 1);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
    }

    @Test
    void failsAfterThreeWrongCodes() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationTooManyAttemptsException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
    }

    @Test
    void expiresAfterFiveMinutesWithoutCallingVonage() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(5));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.check(1L, "123456")).isInstanceOf(VerificationExpiredException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void failsWhenVonageEndsTheRequestBeforeFiveMinutes() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.ENDED);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationTooManyAttemptsException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
    }

    @Test
    void rejectsACodeForAFailedVerificationWithoutCallingVonage() {
        PhoneVerification failed = pendingVerification(NOW.minusMinutes(1));
        failed.markFailed();
        when(repository.findById(1L)).thenReturn(Optional.of(failed));

        assertThatThrownBy(() -> service.check(1L, "123456")).isInstanceOf(VerificationTooManyAttemptsException.class);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void rejectsAnUnknownVerification() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.check(1L, "123456")).isInstanceOf(VerificationNotFoundException.class);
    }

    private PhoneVerification savedVerification() {
        ArgumentCaptor<PhoneVerification> saved = ArgumentCaptor.forClass(PhoneVerification.class);
        verify(repository).save(saved.capture());
        return saved.getValue();
    }

    private static PhoneVerification pendingVerification(OffsetDateTime createdAt) {
        return new PhoneVerification(PhoneVerificationPurpose.VISIT, "phone-hash", "request-1", createdAt);
    }
}
