package com.peephole.server.phoneverification;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.VerifyStatusCallback;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// What a Verify status callback changes, as specs/silent-authentication.md describes. Only a pending verification
// changes: a verified, failed or expired one keeps its status. A summary reports the whole request once it ends, and
// an event about the silent step only moves the verification on, since Vonage may send expired for that step alone
// and then go on with the SMS by itself. An error from Vonage or the database rolls everything back, and the webhook
// answers 500 so Vonage sends the callback again
@Service
class VerifyStatusCallbackService {

    private final PhoneVerificationRepository repository;
    private final PhoneVerifier phoneVerifier;
    private final Clock clock;

    VerifyStatusCallbackService(PhoneVerificationRepository repository, PhoneVerifier phoneVerifier, Clock clock) {
        this.repository = repository;
        this.phoneVerifier = phoneVerifier;
        this.clock = clock;
    }

    @Transactional
    void handle(VerifyStatusCallback callback) {
        repository
                .findWithLockByVonageRequestId(callback.requestId())
                .filter(verification -> verification.getStatus() == PhoneVerificationStatus.PENDING)
                .ifPresent(verification -> apply(verification, callback));
    }

    private void apply(PhoneVerification verification, VerifyStatusCallback callback) {
        if (verification.hasExpiredAt(OffsetDateTime.now(clock))) {
            verification.markExpired();
            return;
        }
        switch (callback.type()) {
            case SUMMARY -> requestEnded(verification, callback);
            case EVENT -> {
                if (callback.isSilentAuthEvent() && verification.getChannel() == PhoneVerificationChannel.SILENT_AUTH) {
                    silentStepEnded(verification, callback);
                }
            }
            // Any other type changes nothing
            default -> {}
        }
    }

    // A completed request still brings its code back through silent-check or check, so only an ending without one
    // changes the verification. Peephole only cancels a request when a new code replaces it, so cancelled is handled
    // as expired
    private static void requestEnded(PhoneVerification verification, VerifyStatusCallback callback) {
        switch (callback.status()) {
            case EXPIRED, CANCELLED -> verification.markExpired();
            case FAILED, USER_REJECTED, REJECTED, BLOCKED -> verification.markFailed();
            default -> {}
        }
    }

    private void silentStepEnded(PhoneVerification verification, VerifyStatusCallback callback) {
        switch (callback.status()) {
            // The operator never answered: Vonage moves a real number on to SMS by itself, and a +990 number, which
            // has no SMS step, has nothing left
            case EXPIRED -> {
                if (verification.hasSmsFallback()) {
                    verification.moveOnToSms();
                } else {
                    verification.markExpired();
                }
            }
            // Blocked by Vonage's velocity rules or because the number is VoIP, which the SMS step would hit too
            case BLOCKED -> verification.markFailed();
            // As sms-fallback does
            case FAILED, USER_REJECTED, REJECTED -> SmsFallback.apply(verification, phoneVerifier);
            default -> {}
        }
    }
}
