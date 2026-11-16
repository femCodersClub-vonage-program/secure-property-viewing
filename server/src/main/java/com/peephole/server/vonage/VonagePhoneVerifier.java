package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.verify2.SmsWorkflow;
import com.vonage.client.verify2.VerificationRequest;
import com.vonage.client.verify2.Verify2Client;
import com.vonage.client.verify2.VerifyResponseException;
import java.net.URI;
import java.util.UUID;

public class VonagePhoneVerifier implements PhoneVerifier {

    private static final String BRAND = "Peephole";
    private static final int CODE_LENGTH = 6;
    // 5 minutes, as decided in the spec. Verify's default is 180 seconds
    private static final int CHANNEL_TIMEOUT_SECONDS = 300;
    // The error type Vonage uses for an invalid phone number, according to the Vonage Documentation MCP Server
    private static final URI INVALID_PARAMS = URI.create("https://developer.vonage.com/en/api-errors#invalid-params");

    private final Verify2Client verify2Client;

    public VonagePhoneVerifier(Verify2Client verify2Client) {
        this.verify2Client = verify2Client;
    }

    @Override
    public String start(String phone) {
        try {
            VerificationRequest request = VerificationRequest.builder()
                    .brand(BRAND)
                    .addWorkflow(new SmsWorkflow(phone))
                    .codeLength(CODE_LENGTH)
                    .channelTimeout(CHANNEL_TIMEOUT_SECONDS)
                    .build();
            return verify2Client.sendVerification(request).getRequestId().toString();
        } catch (IllegalArgumentException exception) {
            // The SDK checks the number before sending it, and its message includes the number, so it is dropped
            throw new PhoneNumberRejectedException();
        } catch (VerifyResponseException exception) {
            throw switch (exception.getStatusCode()) {
                case 409 -> new ConcurrentVerificationException();
                case 422 -> rejectedNumberOrSystemError(exception);
                case 429 ->
                    new PhoneVerifierException("Vonage's rate limit was reached when starting a verification (429)");
                default ->
                    new PhoneVerifierException(
                            "Vonage answered " + exception.getStatusCode() + " when starting a verification");
            };
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not reach Vonage to start a verification");
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
                // 410: too many wrong codes or expired. 404: the request has already ended, for example canceled
                case 404, 410 -> CodeCheckResult.ENDED;
                default ->
                    throw new PhoneVerifierException("Vonage answered " + exception.getStatusCode()
                            + " when checking the code of request " + requestId);
            };
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not reach Vonage to check the code of request " + requestId);
        }
    }

    @Override
    public void cancel(String requestId) {
        try {
            verify2Client.cancelVerification(UUID.fromString(requestId));
        } catch (VerifyResponseException exception) {
            // A 404 means the request has already ended, which is what canceling wants
            if (exception.getStatusCode() != 404) {
                throw new PhoneVerifierException(
                        "Vonage answered " + exception.getStatusCode() + " when canceling request " + requestId);
            }
        } catch (VonageClientException exception) {
            throw new PhoneVerifierException("Could not reach Vonage to cancel request " + requestId);
        }
    }

    // Only an invalid-params 422 is about the number. Any other 422 is a problem on our side, so it is a system error
    private static RuntimeException rejectedNumberOrSystemError(VerifyResponseException exception) {
        if (INVALID_PARAMS.equals(exception.getType())) {
            return new PhoneNumberRejectedException();
        }
        return new PhoneVerifierException(
                "Vonage answered 422 (" + exception.getType() + ") when starting a verification");
    }
}
