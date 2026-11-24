package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import com.vonage.client.VonageClientException;
import com.vonage.client.verify2.VerificationRequest;
import com.vonage.client.verify2.VerificationResponse;
import com.vonage.client.verify2.Verify2Client;
import com.vonage.client.verify2.VerifyResponseException;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VonagePhoneVerifierTest {

    private static final String PHONE = "+34600000000";
    private static final String REQUEST_ID = "c11236f4-00bf-4b89-84ba-88b25df97315";
    private static final URI INVALID_PARAMS = URI.create("https://developer.vonage.com/en/api-errors#invalid-params");
    private static final String REDIRECT_URL = "https://peephole.example/verify/silent-auth";
    private static final String CHECK_URL =
            "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect";

    @Mock
    private Verify2Client verify2Client;

    private VonagePhoneVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new VonagePhoneVerifier(verify2Client, Duration.ZERO);
    }

    // Starting a verification

    @Test
    void startsAnSmsVerificationAndReturnsTheRequestId() {
        VerificationResponse response = mock(VerificationResponse.class);
        when(response.getRequestId()).thenReturn(UUID.fromString(REQUEST_ID));
        when(verify2Client.sendVerification(any())).thenReturn(response);

        assertThat(verifier.start(PHONE)).isEqualTo(REQUEST_ID);

        ArgumentCaptor<VerificationRequest> request = ArgumentCaptor.forClass(VerificationRequest.class);
        verify(verify2Client).sendVerification(request.capture());
        assertThat(request.getValue().getBrand()).isEqualTo("Peephole");
        assertThat(request.getValue().getCodeLength()).isEqualTo(6);
        assertThat(request.getValue().getChannelTimeout()).isEqualTo(300);
        // The workflow list is not public in the SDK, so the check reads the JSON that is sent to Vonage
        String json = request.getValue().toJson();
        List<String> channels = JsonPath.read(json, "$.workflow[*].channel");
        assertThat(channels).containsExactly("sms");
    }

    @Test
    void rejectsANumberTheSdkCannotParseWithoutThePhoneInTheMessage() {
        assertThatThrownBy(() -> verifier.start("+34600"))
                .isInstanceOf(PhoneNumberRejectedException.class)
                .hasMessageNotContaining("34600")
                .hasNoCause();
        verify(verify2Client, never()).sendVerification(any());
    }

    @Test
    void turnsAStartErrorIntoAPhoneVerifierExceptionWithoutThePhone() {
        VerifyResponseException rateLimited = apiError(429);
        when(verify2Client.sendVerification(any())).thenThrow(rateLimited);

        assertThatThrownBy(() -> verifier.start(PHONE))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining("429")
                .hasMessageNotContaining(PHONE)
                .hasNoCause();
    }

    @Test
    void reportsAVerificationInProgressWhenVonageAnswers409() {
        VerifyResponseException concurrent = apiError(409);
        when(verify2Client.sendVerification(any())).thenThrow(concurrent);

        assertThatThrownBy(() -> verifier.start(PHONE)).isInstanceOf(ConcurrentVerificationException.class);
    }

    @Test
    void reportsARejectedNumberWhenVonageAnswersInvalidParams() {
        VerifyResponseException invalidParams = apiError(422);
        when(invalidParams.getType()).thenReturn(INVALID_PARAMS);
        when(verify2Client.sendVerification(any())).thenThrow(invalidParams);

        assertThatThrownBy(() -> verifier.start(PHONE))
                .isInstanceOf(PhoneNumberRejectedException.class)
                .hasMessageNotContaining(PHONE);
    }

    @Test
    void turnsAnyOther422IntoAPhoneVerifierException() {
        VerifyResponseException otherError = apiError(422);
        when(otherError.getType()).thenReturn(URI.create("https://developer.vonage.com/en/api-errors#other"));
        when(verify2Client.sendVerification(any())).thenThrow(otherError);

        assertThatThrownBy(() -> verifier.start(PHONE))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining("422")
                .hasMessageNotContaining(PHONE)
                .hasNoCause();
    }

    // Starting a verification with Silent Authentication

    @Test
    void startsWithTheSilentCheckThenSmsAndReturnsTheCheckUrl() {
        VerificationResponse response = mock(VerificationResponse.class);
        when(response.getRequestId()).thenReturn(UUID.fromString(REQUEST_ID));
        when(response.getCheckUrl()).thenReturn(URI.create(CHECK_URL));
        when(verify2Client.sendVerification(any())).thenReturn(response);

        SilentAuthStart start = verifier.startWithSilentAuth(PHONE, REDIRECT_URL, true);

        assertThat(start.requestId()).isEqualTo(REQUEST_ID);
        assertThat(start.checkUrl()).contains(CHECK_URL);
        ArgumentCaptor<VerificationRequest> request = ArgumentCaptor.forClass(VerificationRequest.class);
        verify(verify2Client).sendVerification(request.capture());
        assertThat(request.getValue().getBrand()).isEqualTo("Peephole");
        assertThat(request.getValue().getCodeLength()).isEqualTo(6);
        assertThat(request.getValue().getChannelTimeout()).isEqualTo(300);
        String json = request.getValue().toJson();
        List<String> channels = JsonPath.read(json, "$.workflow[*].channel");
        assertThat(channels).containsExactly("silent_auth", "sms");
        String redirectUrl = JsonPath.read(json, "$.workflow[0].redirect_url");
        assertThat(redirectUrl).isEqualTo(REDIRECT_URL);
    }

    @Test
    void startsWithOnlyTheSilentCheckWithoutTheSmsFallback() {
        VerificationResponse response = mock(VerificationResponse.class);
        when(response.getRequestId()).thenReturn(UUID.fromString(REQUEST_ID));
        when(response.getCheckUrl()).thenReturn(URI.create(CHECK_URL));
        when(verify2Client.sendVerification(any())).thenReturn(response);

        verifier.startWithSilentAuth("+990123400", REDIRECT_URL, false);

        ArgumentCaptor<VerificationRequest> request = ArgumentCaptor.forClass(VerificationRequest.class);
        verify(verify2Client).sendVerification(request.capture());
        List<String> channels = JsonPath.read(request.getValue().toJson(), "$.workflow[*].channel");
        assertThat(channels).containsExactly("silent_auth");
    }

    @Test
    void returnsNoCheckUrlWhenVonageGivesNone() {
        VerificationResponse response = mock(VerificationResponse.class);
        when(response.getRequestId()).thenReturn(UUID.fromString(REQUEST_ID));
        when(verify2Client.sendVerification(any())).thenReturn(response);

        SilentAuthStart start = verifier.startWithSilentAuth(PHONE, REDIRECT_URL, true);

        assertThat(start.requestId()).isEqualTo(REQUEST_ID);
        assertThat(start.checkUrl()).isEmpty();
    }

    @Test
    void reportsTheSilentCheckAsUnavailableWhenVonageAnswers412() {
        VerifyResponseException notAccepted = apiError(412);
        when(verify2Client.sendVerification(any())).thenThrow(notAccepted);

        assertThatThrownBy(() -> verifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .isInstanceOf(SilentAuthUnavailableException.class)
                .hasMessageNotContaining(PHONE);
    }

    @Test
    void reportsAVerificationInProgressWhenTheSilentStartAnswers409() {
        VerifyResponseException concurrent = apiError(409);
        when(verify2Client.sendVerification(any())).thenThrow(concurrent);

        assertThatThrownBy(() -> verifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .isInstanceOf(ConcurrentVerificationException.class);
    }

    // Checking a code

    @Test
    void returnsMatchedWhenTheCodeIsRight() {
        assertThat(verifier.check(REQUEST_ID, "123456")).isEqualTo(CodeCheckResult.MATCHED);
    }

    @Test
    void returnsWrongCodeWhenVonageAnswers400() {
        VerifyResponseException invalidCode = apiError(400);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(invalidCode);

        assertThat(verifier.check(REQUEST_ID, "000000")).isEqualTo(CodeCheckResult.WRONG_CODE);
    }

    @Test
    void returnsEndedWhenVonageAnswers410() {
        VerifyResponseException ended = apiError(410);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(ended);

        assertThat(verifier.check(REQUEST_ID, "000000")).isEqualTo(CodeCheckResult.ENDED);
    }

    @Test
    void returnsEndedWhenVonageAnswers404() {
        VerifyResponseException alreadyEnded = apiError(404);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(alreadyEnded);

        assertThat(verifier.check(REQUEST_ID, "000000")).isEqualTo(CodeCheckResult.ENDED);
    }

    @Test
    void turnsAnyOtherCheckErrorIntoAPhoneVerifierException() {
        VerifyResponseException serverError = apiError(500);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(serverError);

        assertThatThrownBy(() -> verifier.check(REQUEST_ID, "123456"))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining(REQUEST_ID)
                .hasNoCause();
    }

    @Test
    void turnsANetworkFailureIntoAPhoneVerifierException() {
        VonageClientException networkFailure = mock(VonageClientException.class);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(networkFailure);

        assertThatThrownBy(() -> verifier.check(REQUEST_ID, "123456"))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining(REQUEST_ID)
                .hasNoCause();
    }

    // Moving on to the SMS step

    @Test
    void movesTheRequestOnToSms() {
        assertThat(verifier.moveToSms(REQUEST_ID)).isEqualTo(SmsStepResult.STARTED);

        verify(verify2Client).nextWorkflow(UUID.fromString(REQUEST_ID));
    }

    @Test
    void triesAgainWhenItIsTooEarlyToMoveOn() {
        VerifyResponseException tooEarly = apiError(409);
        doThrow(tooEarly).doNothing().when(verify2Client).nextWorkflow(any());

        assertThat(verifier.moveToSms(REQUEST_ID)).isEqualTo(SmsStepResult.STARTED);

        verify(verify2Client, times(2)).nextWorkflow(UUID.fromString(REQUEST_ID));
    }

    @Test
    void stopsAfterThreeMoreTriesAndLetsVerifyMoveOnByItself() {
        VerifyResponseException tooEarly = apiError(409);
        doThrow(tooEarly).when(verify2Client).nextWorkflow(any());

        assertThat(verifier.moveToSms(REQUEST_ID)).isEqualTo(SmsStepResult.STARTED);

        verify(verify2Client, times(4)).nextWorkflow(UUID.fromString(REQUEST_ID));
    }

    @Test
    void returnsEndedWhenTheRequestHasAlreadyEnded() {
        VerifyResponseException ended = apiError(410);
        doThrow(ended).when(verify2Client).nextWorkflow(any());

        assertThat(verifier.moveToSms(REQUEST_ID)).isEqualTo(SmsStepResult.ENDED);
    }

    @Test
    void turnsAnyOtherNextStepErrorIntoAPhoneVerifierException() {
        VerifyResponseException serverError = apiError(500);
        doThrow(serverError).when(verify2Client).nextWorkflow(any());

        assertThatThrownBy(() -> verifier.moveToSms(REQUEST_ID))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining(REQUEST_ID)
                .hasNoCause();
    }

    // Canceling a request

    @Test
    void cancelsTheRequest() {
        verifier.cancel(REQUEST_ID);

        verify(verify2Client).cancelVerification(UUID.fromString(REQUEST_ID));
    }

    @Test
    void ignoresA404WhenCanceling() {
        VerifyResponseException alreadyEnded = apiError(404);
        doThrow(alreadyEnded).when(verify2Client).cancelVerification(any());

        assertThatCode(() -> verifier.cancel(REQUEST_ID)).doesNotThrowAnyException();
    }

    @Test
    void turnsAnyOtherCancelErrorIntoAPhoneVerifierException() {
        VerifyResponseException serverError = apiError(500);
        doThrow(serverError).when(verify2Client).cancelVerification(any());

        assertThatThrownBy(() -> verifier.cancel(REQUEST_ID))
                .isInstanceOf(PhoneVerifierException.class)
                .hasMessageContaining(REQUEST_ID)
                .hasNoCause();
    }

    private static VerifyResponseException apiError(int statusCode) {
        VerifyResponseException exception = mock(VerifyResponseException.class);
        when(exception.getStatusCode()).thenReturn(statusCode);
        return exception;
    }
}
