package com.peephole.server.postvisitcall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import org.junit.jupiter.api.Test;

class PostVisitCallWebhookUrlsTest {

    @Test
    void buildsBothWebhookUrlsWithTheCallId() {
        PostVisitCallWebhookUrls urls = new PostVisitCallWebhookUrls(true, "https://peephole.example/");

        assertThat(urls.key(7)).isEqualTo(URI.create("https://peephole.example/api/webhooks/voice/input?callId=7"));
        assertThat(urls.event(7)).isEqualTo(URI.create("https://peephole.example/api/webhooks/voice/event?callId=7"));
    }

    @Test
    void refusesToStartWithCallsOnAndNoPublicUrl() {
        assertThatThrownBy(() -> new PostVisitCallWebhookUrls(true, " "))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("SERVER_PUBLIC_URL is not set");
    }

    @Test
    void refusesAPublicUrlWithoutHttps() {
        assertThatThrownBy(() -> new PostVisitCallWebhookUrls(true, "http://peephole.example"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("SERVER_PUBLIC_URL must start with https://");
    }

    @Test
    void needsNoPublicUrlWhileCallsAreOff() {
        new PostVisitCallWebhookUrls(false, "");
    }
}
