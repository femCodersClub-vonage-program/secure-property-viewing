package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vonage.client.VonageClientException;
import com.vonage.client.verify2.VerificationRequest;
import com.vonage.client.verify2.VerificationResponse;
import com.vonage.client.verify2.Verify2Client;
import com.vonage.client.verify2.VerifyResponseException;
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

    @Mock
    private Verify2Client verify2Client;

    private VonagePhoneVerifier verifier;

    @BeforeEach
    void setUp() {
        verifier = new VonagePhoneVerifier(verify2Client);
    }

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
    }

    @Test
    void turnsAStartErrorIntoAPhoneVerifierException() {
        VerifyResponseException rateLimited = mock(VerifyResponseException.class);
        when(verify2Client.sendVerification(any())).thenThrow(rateLimited);

        assertThatThrownBy(() -> verifier.start(PHONE)).isInstanceOf(PhoneVerifierException.class);
    }

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
    void turnsAnyOtherCheckErrorIntoAPhoneVerifierException() {
        VerifyResponseException serverError = apiError(500);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(serverError);

        assertThatThrownBy(() -> verifier.check(REQUEST_ID, "123456")).isInstanceOf(PhoneVerifierException.class);
    }

    @Test
    void turnsANetworkFailureIntoAPhoneVerifierException() {
        VonageClientException networkFailure = mock(VonageClientException.class);
        when(verify2Client.checkVerificationCode(any(), any())).thenThrow(networkFailure);

        assertThatThrownBy(() -> verifier.check(REQUEST_ID, "123456")).isInstanceOf(PhoneVerifierException.class);
    }

    @Test
    void cancelsTheRequest() {
        verifier.cancel(REQUEST_ID);

        verify(verify2Client).cancelVerification(UUID.fromString(REQUEST_ID));
    }

    @Test
    void ignoresA404WhenCancelling() {
        VerifyResponseException alreadyEnded = apiError(404);
        doThrow(alreadyEnded).when(verify2Client).cancelVerification(any());

        assertThatCode(() -> verifier.cancel(REQUEST_ID)).doesNotThrowAnyException();
    }

    @Test
    void turnsAnyOtherCancelErrorIntoAPhoneVerifierException() {
        VerifyResponseException serverError = apiError(500);
        doThrow(serverError).when(verify2Client).cancelVerification(any());

        assertThatThrownBy(() -> verifier.cancel(REQUEST_ID)).isInstanceOf(PhoneVerifierException.class);
    }

    private static VerifyResponseException apiError(int statusCode) {
        VerifyResponseException exception = mock(VerifyResponseException.class);
        when(exception.getStatusCode()).thenReturn(statusCode);
        return exception;
    }
}
