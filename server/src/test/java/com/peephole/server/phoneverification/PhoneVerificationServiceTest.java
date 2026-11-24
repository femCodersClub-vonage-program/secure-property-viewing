package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
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
import com.peephole.server.vonage.SilentAuthStart;
import com.peephole.server.vonage.SilentAuthUnavailableException;
import com.peephole.server.vonage.SmsStepResult;
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
    private static final String VIRTUAL_OPERATOR_PHONE = "+990123400";
    private static final String REDIRECT_URL = "http://localhost:5173/verification/return";
    private static final String CHECK_URL = "https://api.nexmo.com/v2/verify/request-1/silent-auth/redirect";
    private static final SilentAuthSettings SILENT_AUTH_ON = new SilentAuthSettings(true, true, REDIRECT_URL);

    @Mock
    private PhoneVerificationRepository repository;

    @Mock
    private PhoneVerifier phoneVerifier;

    // A test double: these tests run one at a time, so there is nothing to lock
    @Mock
    private VerificationStartLock startLock;

    private final PhoneHasher phoneHasher = new PhoneHasher("test-secret");

    private PhoneVerificationService service;

    @BeforeEach
    void setUp() {
        service = serviceWith(SilentAuthSettings.OFF);
    }

    private PhoneVerificationService serviceWith(SilentAuthSettings silentAuth) {
        Clock clock = Clock.fixed(NOW.toInstant(), ZoneOffset.UTC);
        return new PhoneVerificationService(repository, phoneVerifier, phoneHasher, startLock, silentAuth, clock);
    }

    // Starting a verification

    @Test
    void startsAVerificationAndSavesItAsPending() {
        when(phoneVerifier.start(PHONE)).thenReturn("request-1");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response = service.start(PHONE, PhoneVerificationPurpose.VISIT, null, false);

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.resendAvailableAt()).isEqualTo(NOW.plusSeconds(32));
        PhoneVerification saved = savedVerification();
        assertThat(saved.getVonageRequestId()).isEqualTo("request-1");
        assertThat(saved.getPhoneHash()).isEqualTo(phoneHasher.hash(PHONE));
        assertThat(saved.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectsAPhoneThatStartedFiveVerificationsInTheLastHour() {
        when(repository.countByPhoneHashAndCreatedAtAfter(phoneHasher.hash(PHONE), NOW.minusHours(1)))
                .thenReturn(5L);

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null, false))
                .isInstanceOf(VerificationLimitReachedException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsAnyPhoneWhenTheServerStartedThirtyVerificationsInTheLastHour() {
        when(repository.countByCreatedAtAfter(NOW.minusHours(1))).thenReturn(30L);

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null, false))
                .isInstanceOf(VerificationLimitReachedException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsANewCodeBeforeThirtyTwoSeconds() {
        PhoneVerification pending = pendingVerification(NOW.minusSeconds(31));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false))
                .isInstanceOf(VerificationResendTooSoonException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void replacesThePendingVerificationAfterThirtyTwoSeconds() {
        PhoneVerification pending = pendingVerification(NOW.minusSeconds(32));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false);

        verify(phoneVerifier).cancel("request-1");
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        assertThat(savedVerification().getVonageRequestId()).isEqualTo("request-2");
    }

    @Test
    void startsANewVerificationAfterThreeWrongCodes() {
        PhoneVerification failed = pendingVerification(NOW.minusMinutes(1));
        failed.markFailed();
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(failed));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response = service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false);

        verify(phoneVerifier).cancel("request-1");
        assertThat(failed.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    void asksToWaitAfterThreeQuickWrongCodes() {
        PhoneVerification failed = pendingVerification(NOW.minusSeconds(20));
        failed.markFailed();
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(failed));

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false))
                .isInstanceOf(VerificationResendTooSoonException.class);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void keepsAVerifiedVerificationWhenANewOneStarts() {
        PhoneVerification verified = pendingVerification(NOW.minusMinutes(1));
        verified.markVerified(NOW.minusSeconds(30));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verified));
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false);

        verify(phoneVerifier, never()).cancel(any());
        assertThat(verified.getStatus()).isEqualTo(PhoneVerificationStatus.VERIFIED);
    }

    @Test
    void reportsAVerificationInProgressFromAnotherSession() {
        when(phoneVerifier.start(PHONE)).thenThrow(new ConcurrentVerificationException());

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null, false))
                .isInstanceOf(VerificationInProgressException.class);
    }

    @Test
    void reportsANumberVonageCannotSendTo() {
        when(phoneVerifier.start(PHONE)).thenThrow(new PhoneNumberRejectedException());

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, null, false))
                .isInstanceOf(FieldValidationException.class)
                .extracting("field")
                .isEqualTo("phone");
    }

    // Starting with Silent Authentication

    @Test
    void startsTheSilentCheckAndReturnsItsCheckUrl() {
        PhoneVerificationService silentService = serviceWith(SILENT_AUTH_ON);
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-1", Optional.of(CHECK_URL)));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response =
                silentService.start(PHONE, PhoneVerificationPurpose.VISIT, null, true);

        assertThat(response.checkUrl()).isEqualTo(CHECK_URL);
        PhoneVerification saved = savedVerification();
        assertThat(saved.getChannel()).isEqualTo(PhoneVerificationChannel.SILENT_AUTH);
        assertThat(saved.hasSmsFallback()).isTrue();
    }

    @Test
    void goesStraightToSmsWhenVonageGivesNoCheckUrl() {
        PhoneVerificationService silentService = serviceWith(SILENT_AUTH_ON);
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-1", Optional.empty()));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response =
                silentService.start(PHONE, PhoneVerificationPurpose.VISIT, null, true);

        assertThat(response.checkUrl()).isNull();
        assertThat(savedVerification().getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void startsAnSmsOnlyVerificationWhenTheOperatorDoesNotSupportTheSilentCheck() {
        PhoneVerificationService silentService = serviceWith(SILENT_AUTH_ON);
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenThrow(new SilentAuthUnavailableException());
        when(phoneVerifier.start(PHONE)).thenReturn("request-2");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response =
                silentService.start(PHONE, PhoneVerificationPurpose.VISIT, null, true);

        assertThat(response.checkUrl()).isNull();
        PhoneVerification saved = savedVerification();
        assertThat(saved.getVonageRequestId()).isEqualTo("request-2");
        assertThat(saved.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
    }

    @Test
    void startsAnSmsOnlyVerificationWithoutSilentAuthEvenWhenItIsOn() {
        PhoneVerificationService silentService = serviceWith(SILENT_AUTH_ON);
        when(phoneVerifier.start(PHONE)).thenReturn("request-1");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        silentService.start(PHONE, PhoneVerificationPurpose.VISIT, null, false);

        verify(phoneVerifier, never()).startWithSilentAuth(any(), any(), anyBoolean());
        assertThat(savedVerification().getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
    }

    @Test
    void ignoresSilentAuthWhileItIsOff() {
        when(phoneVerifier.start(PHONE)).thenReturn("request-1");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        StartPhoneVerificationResponse response = service.start(PHONE, PhoneVerificationPurpose.VISIT, null, true);

        assertThat(response.checkUrl()).isNull();
        verify(phoneVerifier, never()).startWithSilentAuth(any(), any(), anyBoolean());
    }

    @Test
    void startsAVirtualOperatorNumberWithOnlyTheSilentCheck() {
        PhoneVerificationService silentService = serviceWith(SILENT_AUTH_ON);
        when(phoneVerifier.startWithSilentAuth(VIRTUAL_OPERATOR_PHONE, REDIRECT_URL, false))
                .thenReturn(new SilentAuthStart("request-1", Optional.of(CHECK_URL)));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        silentService.start(VIRTUAL_OPERATOR_PHONE, PhoneVerificationPurpose.VISIT, null, true);

        PhoneVerification saved = savedVerification();
        assertThat(saved.getChannel()).isEqualTo(PhoneVerificationChannel.SILENT_AUTH);
        assertThat(saved.hasSmsFallback()).isFalse();
    }

    @Test
    void rejectsAVirtualOperatorNumberWhileTheyAreNotAccepted() {
        assertThatThrownBy(() -> service.start(VIRTUAL_OPERATOR_PHONE, PhoneVerificationPurpose.VISIT, null, true))
                .isInstanceOf(FieldValidationException.class)
                .extracting("field")
                .isEqualTo("phone");
        verify(phoneVerifier, never()).startWithSilentAuth(any(), any(), anyBoolean());
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsANewCodeWhileTheSilentCheckIsPending() {
        PhoneVerification silent = new PhoneVerification(
                PhoneVerificationPurpose.VISIT,
                "phone-hash",
                "request-1",
                NOW.minusMinutes(1),
                PhoneVerificationChannel.SILENT_AUTH,
                true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(silent));

        assertThatThrownBy(() -> service.start(PHONE, PhoneVerificationPurpose.VISIT, 1L, false))
                .isInstanceOf(VerificationResendTooSoonException.class);
        verify(phoneVerifier, never()).cancel(any());
    }

    // Checking the code of the silent check

    @Test
    void verifiesWithTheSilentCode() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));
        when(phoneVerifier.check("request-1", "si9sfG")).thenReturn(CodeCheckResult.MATCHED);

        PhoneVerificationResponse response = service.silentCheck(1L, "request-1", "si9sfG");

        assertThat(response.status()).isEqualTo("VERIFIED");
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SILENT_AUTH);
        assertThat(verification.getCheckAttempts()).isZero();
    }

    @Test
    void rejectsARequestIdThatIsNotTheStoredOne() {
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(silentVerification(true)));

        assertThatThrownBy(() -> service.silentCheck(1L, "another-request", "si9sfG"))
                .isInstanceOf(VerificationNotFoundException.class);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void answersUnavailableWhenTheVerificationIsAlreadyOnSms() {
        when(repository.findWithLockById(1L))
                .thenReturn(Optional.of(new PhoneVerification(
                        PhoneVerificationPurpose.VISIT, "phone-hash", "request-1", NOW.minusMinutes(1))));

        assertThatThrownBy(() -> service.silentCheck(1L, "request-1", "si9sfG"))
                .isInstanceOf(VerificationSilentCheckUnavailableException.class);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void movesOnToSmsWhenTheSilentCodeIsRejected() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));
        when(phoneVerifier.check("request-1", "si9sfG")).thenReturn(CodeCheckResult.WRONG_CODE);
        when(phoneVerifier.moveToSms("request-1")).thenReturn(SmsStepResult.STARTED);

        assertThatThrownBy(() -> service.silentCheck(1L, "request-1", "si9sfG"))
                .isInstanceOf(VerificationCodeInvalidException.class);
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(verification.getCheckAttempts()).isZero();
    }

    @Test
    void failsAVerificationWithoutAnSmsStepWhenTheSilentCodeIsRejected() {
        PhoneVerification verification = silentVerification(false);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));
        when(phoneVerifier.check("request-1", "si9sfG")).thenReturn(CodeCheckResult.WRONG_CODE);

        PhoneVerificationResponse response = service.silentCheck(1L, "request-1", "si9sfG");

        assertThat(response.status()).isEqualTo("FAILED");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void expiresTheSilentCheckAfterFiveMinutesWithoutCallingVonage() {
        PhoneVerification verification = new PhoneVerification(
                PhoneVerificationPurpose.VISIT,
                "phone-hash",
                "request-1",
                NOW.minusMinutes(5),
                PhoneVerificationChannel.SILENT_AUTH,
                true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));

        assertThatThrownBy(() -> service.silentCheck(1L, "request-1", "si9sfG"))
                .isInstanceOf(VerificationExpiredException.class);
        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verify(phoneVerifier, never()).check(any(), any());
    }

    // Moving on to the SMS code

    @Test
    void movesOnToSmsAndStaysPending() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms("request-1")).thenReturn(SmsStepResult.STARTED);

        PhoneVerificationResponse response = service.smsFallback(1L);

        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(verification.getChannel()).isEqualTo(PhoneVerificationChannel.SMS);
    }

    @Test
    void failsAVerificationWithoutAnSmsStepInsteadOfMovingOn() {
        PhoneVerification verification = silentVerification(false);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));

        PhoneVerificationResponse response = service.smsFallback(1L);

        assertThat(response.status()).isEqualTo("FAILED");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void expiresWhenVonageHasAlreadyEndedTheRequest() {
        PhoneVerification verification = silentVerification(true);
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(verification));
        when(phoneVerifier.moveToSms("request-1")).thenReturn(SmsStepResult.ENDED);

        assertThatThrownBy(() -> service.smsFallback(1L)).isInstanceOf(VerificationExpiredException.class);
        assertThat(verification.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
    }

    @Test
    void answersUnavailableToAFallbackWhenTheVerificationIsAlreadyOnSms() {
        when(repository.findWithLockById(1L))
                .thenReturn(Optional.of(new PhoneVerification(
                        PhoneVerificationPurpose.VISIT, "phone-hash", "request-1", NOW.minusMinutes(1))));

        assertThatThrownBy(() -> service.smsFallback(1L))
                .isInstanceOf(VerificationSilentCheckUnavailableException.class);
        verify(phoneVerifier, never()).moveToSms(any());
    }

    private static PhoneVerification silentVerification(boolean smsFallback) {
        return new PhoneVerification(
                PhoneVerificationPurpose.VISIT,
                "phone-hash",
                "request-1",
                NOW.minusMinutes(1),
                PhoneVerificationChannel.SILENT_AUTH,
                smsFallback);
    }

    // Checking a code

    @Test
    void verifiesTheRightCode() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "123456")).thenReturn(CodeCheckResult.MATCHED);

        PhoneVerificationResponse response = service.check(1L, "123456");

        assertThat(response.status()).isEqualTo("VERIFIED");
        assertThat(pending.getVerifiedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectsAWrongCodeAndCountsTheAttempt() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThat(pending.getCheckAttempts()).isEqualTo((short) 1);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
    }

    @Test
    void failsAfterThreeWrongCodes() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationCodeInvalidException.class);
        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationTooManyAttemptsException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
    }

    @Test
    void expiresAfterFiveMinutesWithoutCallingVonage() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(5));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.check(1L, "123456")).isInstanceOf(VerificationExpiredException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.EXPIRED);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void failsWhenVonageEndsTheRequestBeforeFiveMinutes() {
        PhoneVerification pending = pendingVerification(NOW.minusMinutes(1));
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(pending));
        when(phoneVerifier.check("request-1", "000000")).thenReturn(CodeCheckResult.ENDED);

        assertThatThrownBy(() -> service.check(1L, "000000")).isInstanceOf(VerificationTooManyAttemptsException.class);
        assertThat(pending.getStatus()).isEqualTo(PhoneVerificationStatus.FAILED);
    }

    @Test
    void rejectsACodeForAFailedVerificationWithoutCallingVonage() {
        PhoneVerification failed = pendingVerification(NOW.minusMinutes(1));
        failed.markFailed();
        when(repository.findWithLockById(1L)).thenReturn(Optional.of(failed));

        assertThatThrownBy(() -> service.check(1L, "123456")).isInstanceOf(VerificationTooManyAttemptsException.class);
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void rejectsAnUnknownVerification() {
        when(repository.findWithLockById(1L)).thenReturn(Optional.empty());

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
