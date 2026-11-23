package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import com.peephole.server.common.FieldValidationException;
import com.peephole.server.phoneverification.dto.PhoneVerificationResponse;
import com.peephole.server.phoneverification.dto.StartPhoneVerificationResponse;
import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.ConcurrentVerificationException;
import com.peephole.server.vonage.PhoneNumberRejectedException;
import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.PhoneVerifierException;
import com.peephole.server.vonage.SilentAuthStart;
import com.peephole.server.vonage.SilentAuthUnavailableException;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhoneVerificationService {

    public static final String SESSION_ATTRIBUTE = "phoneVerificationId";

    // The screen map asks for 30 seconds before a new code, plus 2 seconds of margin. The Verify API reference
    // says a cancel is only allowed after 30 seconds. A real test on 2026-11-16 accepted one at about 10 seconds,
    // but the margin keeps the server safe if Verify starts enforcing it
    private static final Duration RESEND_WAIT = Duration.ofSeconds(32);
    private static final Duration EXPIRY = Duration.ofMinutes(5);
    private static final int MAX_WRONG_CODES = 3;
    private static final int MAX_PER_PHONE_PER_HOUR = 5;
    private static final int MAX_PER_HOUR = 30;
    // Numbers that Vonage's Virtual Operator answers for, only accepted while testing (specs/silent-authentication.md)
    private static final String VIRTUAL_OPERATOR_PREFIX = "+990";
    private static final Logger LOGGER = LoggerFactory.getLogger(PhoneVerificationService.class);

    private final PhoneVerificationRepository repository;
    private final PhoneVerifier phoneVerifier;
    private final PhoneHasher phoneHasher;
    private final VerificationStartLock startLock;
    private final SilentAuthSettings silentAuth;
    private final Clock clock;

    PhoneVerificationService(
            PhoneVerificationRepository repository,
            PhoneVerifier phoneVerifier,
            PhoneHasher phoneHasher,
            VerificationStartLock startLock,
            SilentAuthSettings silentAuth,
            Clock clock) {
        this.repository = repository;
        this.phoneVerifier = phoneVerifier;
        this.phoneHasher = phoneHasher;
        this.startLock = startLock;
        this.silentAuth = silentAuth;
        this.clock = clock;
    }

    // previousId is the verification saved in the session, if any: a new code replaces it.
    // If the new code fails, the changes are kept, so a previous verification already canceled in Vonage stays
    // EXPIRED here. Nothing else can be half done: the new verification is only saved once Vonage has sent the code
    // withSilentAuth only applies while Silent Authentication is on. A +990 number always tries the silent check,
    // since the Virtual Operator cannot send an SMS
    @Transactional(
            noRollbackFor = {BusinessException.class, FieldValidationException.class, PhoneVerifierException.class})
    StartPhoneVerificationResponse start(
            String phone, PhoneVerificationPurpose purpose, Long previousId, boolean withSilentAuth) {
        boolean virtualOperatorNumber = phone.startsWith(VIRTUAL_OPERATOR_PREFIX);
        // Before anything else, so a +990 number never counts toward the limits or reaches Vonage
        if (virtualOperatorNumber && !silentAuth.virtualOperator()) {
            throw new FieldValidationException("phone", "must be a real phone number, such as +34600000000");
        }
        startLock.acquire();
        OffsetDateTime now = OffsetDateTime.now(clock);
        String phoneHash = phoneHasher.hash(phone);
        checkLimits(phoneHash, now);

        if (previousId != null) {
            repository
                    .findWithLockById(previousId)
                    .filter(previous -> previous.getStatus() != PhoneVerificationStatus.VERIFIED)
                    .ifPresent(previous -> replace(previous, now));
        }

        Started started = sendCode(phone, withSilentAuth, virtualOperatorNumber);
        PhoneVerification verification = repository.save(new PhoneVerification(
                purpose, phoneHash, started.requestId(), now, started.channel(), !virtualOperatorNumber));
        return new StartPhoneVerificationResponse(
                verification.getId(), verification.getStatus().name(), now.plus(RESEND_WAIT), started.checkUrl());
    }

    // Business errors keep the changes, so a wrong code is still counted
    @Transactional(noRollbackFor = BusinessException.class)
    PhoneVerificationResponse check(long id, String code) {
        PhoneVerification verification =
                repository.findWithLockById(id).orElseThrow(VerificationNotFoundException::new);
        OffsetDateTime now = OffsetDateTime.now(clock);

        if (verification.getStatus() == PhoneVerificationStatus.VERIFIED) {
            return toResponse(verification);
        }
        if (verification.getStatus() == PhoneVerificationStatus.FAILED) {
            throw new VerificationTooManyAttemptsException();
        }
        // An expired code never costs a call to Vonage
        if (verification.getStatus() == PhoneVerificationStatus.EXPIRED || hasExpired(verification, now)) {
            verification.markExpired();
            throw new VerificationExpiredException();
        }

        verification.recordCheckAttempt();
        CodeCheckResult result = phoneVerifier.check(verification.getVonageRequestId(), code);

        if (result == CodeCheckResult.MATCHED) {
            verification.markVerified(now);
            return toResponse(verification);
        }

        // The expiry was checked above, so a request Vonage ended now ended after too many wrong codes
        if (result == CodeCheckResult.ENDED || verification.getCheckAttempts() >= MAX_WRONG_CODES) {
            verification.markFailed();
            throw new VerificationTooManyAttemptsException();
        }
        throw new VerificationCodeInvalidException();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public OffsetDateTime validateForVisit(long id, String phone, Long sessionVerificationId) {
        if (!Objects.equals(id, sessionVerificationId)) {
            throw new PhoneVerificationInvalidException();
        }

        PhoneVerification verification =
                repository.findWithLockById(id).orElseThrow(PhoneVerificationInvalidException::new);
        OffsetDateTime verifiedAt = verification.getVerifiedAt();

        if (verification.getStatus() != PhoneVerificationStatus.VERIFIED
                || verification.getPurpose() != PhoneVerificationPurpose.VISIT
                || verifiedAt == null
                || !phoneHasher.hash(phone).equals(verification.getPhoneHash())) {
            throw new PhoneVerificationInvalidException();
        }
        return verifiedAt;
    }

    private void checkLimits(String phoneHash, OffsetDateTime now) {
        OffsetDateTime oneHourAgo = now.minusHours(1);
        if (repository.countByPhoneHashAndCreatedAtAfter(phoneHash, oneHourAgo) >= MAX_PER_PHONE_PER_HOUR
                || repository.countByCreatedAtAfter(oneHourAgo) >= MAX_PER_HOUR) {
            throw new VerificationLimitReachedException();
        }
    }

    private void replace(PhoneVerification previous, OffsetDateTime now) {
        if (now.isBefore(previous.getCreatedAt().plus(RESEND_WAIT))) {
            throw new VerificationResendTooSoonException();
        }
        // A new code only once the SMS step has started, as the phone verification rules say
        if (previous.getStatus() == PhoneVerificationStatus.PENDING
                && previous.getChannel() == PhoneVerificationChannel.SILENT_AUTH
                && !hasExpired(previous, now)) {
            throw new VerificationResendTooSoonException();
        }
        // Vonage may still have it open, even when it is already FAILED or EXPIRED here
        phoneVerifier.cancel(previous.getVonageRequestId());
        if (previous.getStatus() == PhoneVerificationStatus.PENDING) {
            previous.markExpired();
        }
    }

    // Vonage answers these two cases on purpose, so they reach the person as errors they can act on
    private Started sendCode(String phone, boolean withSilentAuth, boolean virtualOperatorNumber) {
        try {
            if (virtualOperatorNumber) {
                return fromSilentStart(phoneVerifier.startWithSilentAuth(phone, silentAuth.redirectUrl(), false));
            }
            if (withSilentAuth && silentAuth.enabled()) {
                try {
                    return fromSilentStart(phoneVerifier.startWithSilentAuth(phone, silentAuth.redirectUrl(), true));
                } catch (SilentAuthUnavailableException exception) {
                    // The operator has not accepted Peephole's profile and no code is on its way yet, so SMS only
                    LOGGER.info("The operator does not support the silent check, starting an SMS-only verification");
                }
            }
            return new Started(phoneVerifier.start(phone), PhoneVerificationChannel.SMS, null);
        } catch (ConcurrentVerificationException exception) {
            throw new VerificationInProgressException();
        } catch (PhoneNumberRejectedException exception) {
            // Without the number, so a sudden rise can be noticed without personal data
            LOGGER.warn("Vonage rejected the phone number when starting a verification");
            throw new FieldValidationException("phone", "we cannot send an SMS to this number, check it and try again");
        }
    }

    // Without a check URL, Verify has already moved on to the SMS step by itself
    private static Started fromSilentStart(SilentAuthStart start) {
        return start.checkUrl()
                .map(checkUrl -> new Started(start.requestId(), PhoneVerificationChannel.SILENT_AUTH, checkUrl))
                .orElseGet(() -> new Started(start.requestId(), PhoneVerificationChannel.SMS, null));
    }

    private static boolean hasExpired(PhoneVerification verification, OffsetDateTime now) {
        return !now.isBefore(verification.getCreatedAt().plus(EXPIRY));
    }

    private static PhoneVerificationResponse toResponse(PhoneVerification verification) {
        return new PhoneVerificationResponse(
                verification.getId(), verification.getStatus().name());
    }

    // How the verification started in Vonage: its request id, the step it is on, and the check URL if there is one
    private record Started(String requestId, PhoneVerificationChannel channel, String checkUrl) {}
}
