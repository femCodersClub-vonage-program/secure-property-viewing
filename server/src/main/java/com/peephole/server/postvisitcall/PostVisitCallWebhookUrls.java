package com.peephole.server.postvisitcall;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// The webhook URLs Vonage calls during a call, with our call id as a query parameter. With calls on, the server
// doesn't start without a valid SERVER_PUBLIC_URL, as with the other Voice variables
@Component
class PostVisitCallWebhookUrls {

    private final String baseUrl;

    PostVisitCallWebhookUrls(
            @Value("${app.voice.calls-enabled}") boolean callsEnabled,
            @Value("${app.server-public-url}") String serverPublicUrl) {
        this.baseUrl = stripTrailingSlash(serverPublicUrl.strip());
        if (callsEnabled) {
            check(baseUrl);
        }
    }

    URI key(long callId) {
        return URI.create(baseUrl + "/api/webhooks/voice/input?callId=" + callId);
    }

    URI event(long callId) {
        return URI.create(baseUrl + "/api/webhooks/voice/event?callId=" + callId);
    }

    private static void check(String baseUrl) {
        if (baseUrl.isEmpty()) {
            throw new IllegalStateException(
                    "SERVER_PUBLIC_URL is not set. Add it to server/.env as explained in docs/setup.md");
        }
        if (!baseUrl.startsWith("https://")) {
            throw new IllegalStateException(
                    "SERVER_PUBLIC_URL must start with https://. Check it as explained in docs/setup.md");
        }
    }

    private static String stripTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
