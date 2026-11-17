package com.peephole.server.vonage;

import java.time.Duration;

public interface VideoProvider {
    String applicationId();

    // Creates a routed session, for three or more people
    String createSession();

    // A publisher token that expires after validFor. Generated locally, without calling Vonage
    String generateToken(String sessionId, String connectionData, Duration validFor);
}
