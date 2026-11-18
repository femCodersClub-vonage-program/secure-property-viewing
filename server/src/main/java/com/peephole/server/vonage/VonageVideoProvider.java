package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.video.CreateSessionRequest;
import com.vonage.client.video.MediaMode;
import com.vonage.client.video.Role;
import com.vonage.client.video.TokenOptions;
import com.vonage.client.video.VideoClient;
import com.vonage.client.video.VideoResponseException;
import java.time.Duration;

public class VonageVideoProvider implements VideoProvider {

    private final VideoClient videoClient;
    private final String applicationId;

    public VonageVideoProvider(VideoClient videoClient, String applicationId) {
        this.videoClient = videoClient;
        this.applicationId = applicationId;
    }

    @Override
    public String applicationId() {
        return applicationId;
    }

    @Override
    public String createSession() {
        try {
            return videoClient
                    .createSession(CreateSessionRequest.builder()
                            .mediaMode(MediaMode.ROUTED)
                            .build())
                    .getSessionId();
        } catch (VideoResponseException exception) {
            throw new VideoProviderException(
                    "Vonage answered " + exception.getStatusCode() + " when creating a video session");
        } catch (VonageClientException exception) {
            throw new VideoProviderException("Could not reach Vonage to create a video session");
        }
    }

    @Override
    public String generateToken(String sessionId, String connectionData, Duration validFor) {
        return videoClient.generateToken(
                sessionId,
                TokenOptions.builder()
                        .role(Role.PUBLISHER)
                        .expiryLength(validFor)
                        .data(connectionData)
                        .build());
    }
}
