package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vonage.client.VonageClientException;
import com.vonage.client.video.CreateSessionRequest;
import com.vonage.client.video.CreateSessionResponse;
import com.vonage.client.video.MediaMode;
import com.vonage.client.video.Role;
import com.vonage.client.video.TokenOptions;
import com.vonage.client.video.VideoClient;
import com.vonage.client.video.VideoResponseException;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VonageVideoProviderTest {

    private static final String APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
    private static final String SESSION_ID = "2_MX4xMjM0NTY3OH5-session";

    @Mock
    private VideoClient videoClient;

    private VonageVideoProvider provider;

    @BeforeEach
    void setUp() {
        provider = new VonageVideoProvider(videoClient, APPLICATION_ID);
    }

    @Test
    void createsARoutedSession() {
        CreateSessionResponse response = mock(CreateSessionResponse.class);
        when(response.getSessionId()).thenReturn(SESSION_ID);
        when(videoClient.createSession(any(CreateSessionRequest.class))).thenReturn(response);

        assertThat(provider.createSession()).isEqualTo(SESSION_ID);

        ArgumentCaptor<CreateSessionRequest> request = ArgumentCaptor.forClass(CreateSessionRequest.class);
        verify(videoClient).createSession(request.capture());
        assertThat(request.getValue().getMediaMode()).isEqualTo(MediaMode.ROUTED);
    }

    @Test
    void turnsAnErrorFromVonageIntoAVideoProviderExceptionWithoutItsMessage() {
        VideoResponseException error = mock(VideoResponseException.class);
        when(error.getStatusCode()).thenReturn(500);
        when(videoClient.createSession(any(CreateSessionRequest.class))).thenThrow(error);

        assertThatThrownBy(provider::createSession)
                .isInstanceOf(VideoProviderException.class)
                .hasMessage("Vonage answered 500 when creating a video session")
                .hasNoCause();
    }

    @Test
    void turnsAnUnreachableVonageIntoAVideoProviderException() {
        when(videoClient.createSession(any(CreateSessionRequest.class)))
                .thenThrow(new VonageClientException("timeout"));

        assertThatThrownBy(provider::createSession)
                .isInstanceOf(VideoProviderException.class)
                .hasMessage("Could not reach Vonage to create a video session")
                .hasNoCause();
    }

    @Test
    void generatesAPublisherTokenWithTheConnectionDataAndExpiry() {
        when(videoClient.generateToken(eq(SESSION_ID), any(TokenOptions.class))).thenReturn("jwt");

        assertThat(provider.generateToken(SESSION_ID, "role=GUEST", Duration.ofMinutes(50)))
                .isEqualTo("jwt");

        ArgumentCaptor<TokenOptions> options = ArgumentCaptor.forClass(TokenOptions.class);
        verify(videoClient).generateToken(eq(SESSION_ID), options.capture());
        assertThat(options.getValue().getRole()).isEqualTo(Role.PUBLISHER);
        assertThat(options.getValue().getData()).isEqualTo("role=GUEST");
        assertThat(options.getValue().getExpiryLength()).isEqualTo(Duration.ofMinutes(50));
    }

    @Test
    void returnsItsApplicationId() {
        assertThat(provider.applicationId()).isEqualTo(APPLICATION_ID);
    }
}
