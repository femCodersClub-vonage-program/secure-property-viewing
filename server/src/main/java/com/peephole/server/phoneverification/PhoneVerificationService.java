package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PhoneVerificationService {
    static final Duration RESEND_WAIT = Duration.ofSeconds(30);
    static final Duration EXPIRY = Duration.ofMinutes(5);
    static final int MAX_WRONG_CODES = 3;
    static final int MAX_PER_PHONE_PER_HOUR = 5;
    static final int MAX_PER_HOUR = 30;

    private final PhoneVerificationRepository repository;
    private final PhoneVerifier phoneVerifier;
    private final PhoneHasher phoneHasher;
    private final Clock clock;

    PhoneVerificationService(
            PhoneVerificationRepository repository, PhoneVerifier phoneVerifier, PhoneHasher phoneHasher, Clock clock) {
        this.repository = repository;
        this.phoneVerifier = phoneVerifier;
        this.phoneHasher = phoneHasher;
        this.clock = clock;
    }

    // previousId is the verification saved in the session, if any: a new code replaces it
    @Transactional
    PhoneVerification start(String phone, PhoneVerificationPurpose purpose, Long previousId) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        String phoneHash = phoneHasher.hash(phone);
        checkLimits(phoneHash, now);

        if (previousId != null) {
            repository
                    .findById(previousId)
                    .filter(previous -> previous.getStatus() != PhoneVerificationStatus.VERIFIED)
                    .ifPresent(previous -> replace(previous, now));
        }

        String requestId = phoneVerifier.start(phone);
        return repository.save(new PhoneVerification(purpose, phoneHash, requestId, now));
    }

    // Business errors keep the changes, so a wrong code is still counted
    @Transactional(noRollbackFor = BusinessException.class)
    PhoneVerification check(long id, String code) {
        PhoneVerification verification = repository.findById(id).orElseThrow(VerificationNotFoundException::new);
        OffsetDateTime now = OffsetDateTime.now(clock);

        if (verification.getStatus() == PhoneVerificationStatus.VERIFIED) {
            return verification;
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
            return verification;
        }

        // The expiry was checked above, so a request Vonage ended now ended after too many wrong codes
        if (result == CodeCheckResult.ENDED || verification.getCheckAttempts() >= MAX_WRONG_CODES) {
            verification.markFailed();
            throw new VerificationTooManyAttemptsException();
        }
        throw new VerificationCodeInvalidException();
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
        // Vonage may still have it open, even when it is already FAILED or EXPIRED here
        phoneVerifier.cancel(previous.getVonageRequestId());
        if (previous.getStatus() == PhoneVerificationStatus.PENDING) {
            previous.markExpired();
        }
    }

    private static boolean hasExpired(PhoneVerification verification, OffsetDateTime now) {
        return !now.isBefore(verification.getCreatedAt().plus(EXPIRY));
    }
}
