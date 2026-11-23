package com.peephole.server.phoneverification;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SmsStepResult;
import com.peephole.server.vonage.VerifyCallbackStatus;
import com.peephole.server.vonage.VerifyStatusCallback;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// What a Verify status callback changes, as specs/silent-authentication.md describes. Only a pending verification
// changes: a verified, failed or expired one keeps its status
@Service
class VerifyStatusCallbackService {

    private final PhoneVerificationRepository repository;
    private final PhoneVerifier phoneVerifier;

    VerifyStatusCallbackService(PhoneVerificationRepository repository, PhoneVerifier phoneVerifier) {
        this.repository = repository;
        this.phoneVerifier = phoneVerifier;
    }

    @Transactional
    void handle(VerifyStatusCallback callback) {
        repository
                .findWithLockByVonageRequestId(callback.requestId())
                .filter(verification -> verification.getStatus() == PhoneVerificationStatus.PENDING)
                .ifPresent(verification -> apply(verification, callback.status()));
    }

    private void apply(PhoneVerification verification, VerifyCallbackStatus status) {
        switch (status) {
            case EXPIRED -> verification.markExpired();
            case USER_REJECTED, FAILED -> silentCheckFailed(verification);
            // A completed check still brings its code back through silent-check, and other statuses change nothing
            default -> {}
        }
    }

    // As sms-fallback does. A verification already on SMS goes on with its code
    private void silentCheckFailed(PhoneVerification verification) {
        if (verification.getChannel() != PhoneVerificationChannel.SILENT_AUTH) {
            return;
        }
        if (!verification.hasSmsFallback()) {
            verification.markFailed();
            return;
        }
        if (phoneVerifier.moveToSms(verification.getVonageRequestId()) == SmsStepResult.ENDED) {
            verification.markExpired();
            return;
        }
        verification.moveOnToSms();
    }
}
