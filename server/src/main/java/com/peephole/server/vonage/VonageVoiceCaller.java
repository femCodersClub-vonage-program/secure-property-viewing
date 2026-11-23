package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.voice.Call;
import com.vonage.client.voice.MachineDetection;
import com.vonage.client.voice.PhoneEndpoint;
import com.vonage.client.voice.VoiceClient;
import com.vonage.client.voice.VoiceResponseException;
import com.vonage.client.voice.ncco.DtmfSettings;
import com.vonage.client.voice.ncco.InputAction;
import java.net.URI;

public class VonageVoiceCaller implements VoiceCaller {

    private static final int KEY_TIMEOUT_SECONDS = 8;

    private final VoiceClient voiceClient;
    private final String fromNumber;

    public VonageVoiceCaller(VoiceClient voiceClient, String fromNumber) {
        this.voiceClient = voiceClient;
        this.fromNumber = fromNumber;
    }

    // The NCCO goes inside the request, so no answer URL has to be hosted, and a voicemail hangs up before the
    // first action
    @Override
    public String callAndAskForOneKey(String phone, String question, URI keyUrl, URI eventUrl) {
        Call call = Call.builder()
                .to(new PhoneEndpoint(withoutPlus(phone)))
                .from(fromNumber)
                .eventUrl(eventUrl.toString())
                .machineDetection(MachineDetection.HANGUP)
                .ncco(
                        SpanishSpeech.talk(question).bargeIn(true).build(),
                        InputAction.builder()
                                .dtmf(DtmfSettings.builder()
                                        .maxDigits(1)
                                        .timeOut(KEY_TIMEOUT_SECONDS)
                                        .build())
                                .eventUrl(keyUrl.toString())
                                .build())
                .build();
        try {
            return voiceClient.createCall(call).getUuid();
        } catch (VoiceResponseException exception) {
            throw new VoiceCallException("Vonage answered " + exception.getStatusCode() + " when creating a call");
        } catch (VonageClientException exception) {
            throw new VoiceCallException("Could not reach Vonage to create a call");
        }
    }

    // Vonage takes the number in E.164 without the plus sign
    private static String withoutPlus(String phone) {
        return phone.startsWith("+") ? phone.substring(1) : phone;
    }
}
