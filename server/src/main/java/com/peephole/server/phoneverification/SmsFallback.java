package com.peephole.server.phoneverification;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SmsStepResult;

// What happens after a silent check that failed, in one place for the browser and the status webhook: a +990 number,
// which has no SMS step, ends FAILED, and a real one moves on to SMS, unless Verify has already ended the request
final class SmsFallback {

    enum Result {
        FAILED,
        EXPIRED,
        ON_SMS
    }

    private SmsFallback() {}

    static Result apply(PhoneVerification verification, PhoneVerifier phoneVerifier) {
        if (!verification.hasSmsFallback()) {
            verification.markFailed();
            return Result.FAILED;
        }
        if (phoneVerifier.moveToSms(verification.getVonageRequestId()) == SmsStepResult.ENDED) {
            verification.markExpired();
            return Result.EXPIRED;
        }
        verification.moveOnToSms();
        return Result.ON_SMS;
    }
}
