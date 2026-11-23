package com.peephole.server.vonage;

import java.net.URI;

public interface VoiceCaller {

    /**
     * Calls {@code phone}, in E.164, reads {@code question} in Spanish and waits for one key. Vonage sends the key to
     * {@code keyUrl} and the call's status changes to {@code eventUrl}. A voicemail hangs up before the question.
     *
     * @return the call's id in Vonage
     * @throws VoiceCallException if Vonage can't be reached or refuses the call
     */
    String callAndAskForOneKey(String phone, String question, URI keyUrl, URI eventUrl);
}
