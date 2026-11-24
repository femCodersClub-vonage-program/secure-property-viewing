package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.verify2.SilentAuthWorkflow;
import com.vonage.client.verify2.SmsWorkflow;
import com.vonage.client.verify2.VerificationRequest;
import com.vonage.client.verify2.VerificationResponse;
import com.vonage.client.verify2.Verify2Client;
import com.vonage.client.verify2.VerifyResponseException;
import java.net.URI;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

public class VonagePhoneVerifier implements PhoneVerifier {

    private static final String BRAND = "Peephole";
    private static final int CODE_LENGTH = 6;
    // 5 minutes, as decided in the spec. Verify's default is 180 seconds
    private static final int CHANNEL_TIMEOUT_SECONDS = 300;
    // The error type Vonage uses for an invalid phone number, according to the Vonage Documentation MCP Server
    private static final URI INVALID_PARAMS = URI.create("https://developer.vonage.com/en/api-errors#invalid-params");
    // A 409 on the next workflow means it is too early to move on: the spec tries again up to 3 times, 1 second apart
    private static final int NEXT_STEP_RETRIES = 3;

    private final Verify2Client verify2Client;
    private final Duration retryWait;

    public VonagePhoneVerifier(Verify2Client verify2Client) {
        this(verify2Client, Duration.ofSeconds(1));
    }

    // The tests pass a wait of zero, so they don't sleep
    VonagePhoneVerifier(Verify2Client verify2Client, Duration retryWait) {
        this.verify2Client = verify2Client;
        this.retryWait = retryWait;
    }

    @Override
    public String start(String phone) {
        return send(() -> VerificationRequest.builder()
                        .brand(BRAND)
                        .addWorkflow(new SmsWorkflow(phone))
                        .codeLength(CODE_LENGTH)
                        .channelTimeout(CHANNEL_TIMEOUT_SECONDS)
                        .build())
                .getRequestId()
                .toString();
    }

    @Override
    public SilentAuthStart startWithSilentAuth(String phone, String redirectUrl, boolean smsFallback) {
        VerificationResponse response = send(() -> {
            VerificationRequest.Builder builder = VerificationRequest.builder()
                    .brand(BRAND)
                    .addWorkflow(SilentAuthWorkflow.builder(phone)
                            .redirectUrl(redirectUrl)
                            .build());
            if (smsFallback) {
                builder.addWorkflow(new SmsWorkflow(phone))
                        .codeLength(CODE_LENGTH)
                        .channelTimeout(CHANNEL_TIMEOUT_SECONDS);
            }
            return builder.build();
        });
        Optional<String> checkUrl = Optional.ofNullable(response.getCheckUrl()).map(URI::toString);
        return new SilentAuthStart(response.getRequestId().toString(), checkUrl);
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
    public SmsStepResult moveToSms(String requestId) {
        for (int attempt = 0; ; attempt++) {
            try {
                verify2Client.nextWorkflow(UUID.fromString(requestId));
                return SmsStepResult.STARTED;
            } catch (VerifyResponseException exception) {
                int status = exception.getStatusCode();
                if (status == 404 || status == 410) {
                    return SmsStepResult.ENDED;
                }
                if (status != 409) {
                    throw new PhoneVerifierException(
                            "Vonage answered " + status + " when moving request " + requestId + " on to SMS");
                }
                // Verify moves on to SMS by itself once the silent step times out, so there is no need to wait longer
                if (attempt == NEXT_STEP_RETRIES) {
                    return SmsStepResult.STARTED;
                }
                pause(requestId);
            } catch (VonageClientException exception) {
                throw new PhoneVerifierException("Could not reach Vonage to move request " + requestId + " on to SMS");
            }
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

    // The request is built inside the try: the SDK checks the number while building it, and its message includes the
    // number, so it is dropped
    private VerificationResponse send(Supplier<VerificationRequest> request) {
        try {
            return verify2Client.sendVerification(request.get());
        } catch (IllegalArgumentException exception) {
            throw new PhoneNumberRejectedException();
        } catch (VerifyResponseException exception) {
            throw switch (exception.getStatusCode()) {
                case 409 -> new ConcurrentVerificationException();
                case 412 -> new SilentAuthUnavailableException();
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

    private void pause(String requestId) {
        try {
            Thread.sleep(retryWait.toMillis());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PhoneVerifierException("Interrupted while moving request " + requestId + " on to SMS");
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
