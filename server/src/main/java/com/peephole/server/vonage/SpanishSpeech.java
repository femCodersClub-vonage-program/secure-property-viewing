package com.peephole.server.vonage;

import com.vonage.client.voice.TextToSpeechLanguage;
import com.vonage.client.voice.ncco.Ncco;
import com.vonage.client.voice.ncco.TalkAction;

/** The voice of every call, in one place: the question and the closing sentence both speak Spanish from Spain. */
public final class SpanishSpeech {

    private SpanishSpeech() {}

    /** The NCCO that reads {@code text} and ends the call, as a JSON array to answer a webhook with. */
    public static String closingNcco(String text) {
        return new Ncco(talk(text).build()).toJson();
    }

    static TalkAction.Builder talk(String text) {
        return TalkAction.builder(text).language(TextToSpeechLanguage.SPANISH);
    }
}
