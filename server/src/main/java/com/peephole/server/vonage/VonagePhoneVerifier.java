package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.verify2.SmsWorkflow;
import com.vonage.client.verify2.VerificationRequest;
import com.vonage.client.verify2.Verify2Client;
import com.vonage.client.verify2.VerifyResponseException;
import java.util.UUID;

public class VonagePhoneVerifier implements PhoneVerifier {
    private static final String BRAND = "Peephole";
    private static final int CODE_LENGTH = 6;
    // 5 minutes, as decided in the spec. Verify's default is 180 seconds
    private static final int CHANNEL_TIMEOUT_SECONDS = 300;

    private final Verify2Client verify2Client;

    public VonagePhoneVerifier(Verify2Client verify2Client) {
        this.verify2Client = verify2Client;
    }

    @Override
    public String start(String phone) {
        VerificationRequest request = VerificationRequest.builder()
                .brand(BRAND)
                .addWorkflow(new SmsWorkflow(phone))
                .codeLength(CODE_LENGTH)
                .channelTimeout(CHANNEL_TIMEOUT_SECONDS)
                .build();
        try {
            return verify2Client.sendVerification(request).getRequestId().toString();
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not start the verification", exception);
        }
    }

    @Override
    public CodeCheckResult check(String requestId, String code) {
        try {
            verify2Client.checkVerificationCode(UUID.fromString(requestId), code);
            return CodeCheckResult.MATCHED;
        } catch (VerifyResponseException exception) {
            return switch (exception.getStatusCode()) {
                case 400 -> CodeCheckResult.WRONG_CODE;
                case 410 -> CodeCheckResult.ENDED;
                default -> throw new PhoneVerifierException("Could not check the code", exception);
            };
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not check the code", exception);
        }
    }

    @Override
    public void cancel(String requestId) {
        try {
            verify2Client.cancelVerification(UUID.fromString(requestId));
        } catch (VerifyResponseException exception) {
            // A 404 means the request has already ended, which is what cancelling wants
            if (exception.getStatusCode() != 404) {
                throw new PhoneVerifierException("Could not cancel the verification", exception);
            }
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not cancel the verification", exception);
        }
    }
}
