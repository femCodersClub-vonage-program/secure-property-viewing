package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
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

        PhoneVerification verification = service.start(PHONE, PhoneVerificationPurpose.VISIT, null);

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(verification.getVonageRequestId()).isEqualTo("request-1");
        assertThat(verification.getPhoneHash()).isEqualTo(phoneHasher.hash(PHONE));
        assertThat(verification.getCreatedAt()).isEqualTo(NOW);
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

        PhoneVerification verification = service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L);

        verify(phoneVerifier).cancel("request-1");
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        assertThat(verification.getVonageRequestId()).isEqualTo("request-2");
    }

    // Checking a code

    @Test
    void verifiesTheRightCode() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "123456")).thenReturn(CodeCheckResult.MATCHED);

        PhoneVerification verification = service.check(1L, "123456");

        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.VERIFIED);
        assertThat(verification.getVerifiedAt()).isEqualTo(NOW);
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

    private static PhoneVerification pendingVerification(OffsetDateTime createdAt) {
        return new PhoneVerification(PhoneVerificationPurpose.VISIT, "phone-hash", "request-1", createdAt);
    }
}
