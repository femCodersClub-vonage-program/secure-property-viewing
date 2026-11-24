package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vonage.client.VonageClientException;
import com.vonage.client.voice.Call;
import com.vonage.client.voice.CallEvent;
import com.vonage.client.voice.MachineDetection;
import com.vonage.client.voice.PhoneEndpoint;
import com.vonage.client.voice.TextToSpeechLanguage;
import com.vonage.client.voice.VoiceClient;
import com.vonage.client.voice.VoiceResponseException;
import com.vonage.client.voice.ncco.Action;
import com.vonage.client.voice.ncco.InputAction;
import com.vonage.client.voice.ncco.TalkAction;
import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VonageVoiceCallerTest {

    private static final String FROM_NUMBER = "34911067298";
    private static final String PHONE = "+34600000001";
    private static final String CALL_UUID = "63f61863-4a51-4f6b-86e1-46edebcf9356";
    private static final URI KEY_URL = URI.create("https://peephole.example/api/webhooks/voice/input?callId=7");
    private static final URI EVENT_URL = URI.create("https://peephole.example/api/webhooks/voice/event?callId=7");

    @Mock
    private VoiceClient voiceClient;

    private VonageVoiceCaller caller;

    @BeforeEach
    void setUp() {
        caller = new VonageVoiceCaller(voiceClient, FROM_NUMBER);
    }

    @Test
    void callsFromTheNumberAsksTheQuestionAndWaitsForOneKey() {
        CallEvent created = mock(CallEvent.class);
        when(created.getUuid()).thenReturn(CALL_UUID);
        when(voiceClient.createCall(any(Call.class))).thenReturn(created);

        assertThat(caller.callAndAskForOneKey(PHONE, "¿Pregunta?", KEY_URL, EVENT_URL))
                .isEqualTo(CALL_UUID);

        ArgumentCaptor<Call> captured = ArgumentCaptor.forClass(Call.class);
        verify(voiceClient).createCall(captured.capture());
        Call call = captured.getValue();
        // Vonage takes the number without the plus sign
        assertThat(((PhoneEndpoint) call.getTo()[0]).getNumber()).isEqualTo("34600000001");
        assertThat(((PhoneEndpoint) call.getFrom()).getNumber()).isEqualTo(FROM_NUMBER);
        assertThat(call.getEventUrl()).containsExactly(EVENT_URL);
        // A voicemail hangs up before the question plays
        assertThat(call.getMachineDetection()).isEqualTo(MachineDetection.HANGUP);

        List<? extends Action> ncco = List.copyOf(call.getNcco());
        assertThat(ncco).hasSize(2);
        TalkAction question = (TalkAction) ncco.get(0);
        assertThat(question.getText()).isEqualTo("¿Pregunta?");
        assertThat(question.getLanguage()).isEqualTo(TextToSpeechLanguage.SPANISH);
        assertThat(question.getBargeIn()).isTrue();
        InputAction key = (InputAction) ncco.get(1);
        assertThat(key.getType()).containsExactly("dtmf");
        assertThat(key.getDtmf().getMaxDigits()).isEqualTo(1);
        assertThat(key.getDtmf().getTimeOut()).isEqualTo(8);
        assertThat(key.getEventUrl()).containsExactly(KEY_URL);
    }

    @Test
    void turnsARefusalFromVonageIntoAVoiceCallExceptionWithoutItsMessage() {
        VoiceResponseException refusal = mock(VoiceResponseException.class);
        when(refusal.getStatusCode()).thenReturn(400);
        when(voiceClient.createCall(any(Call.class))).thenThrow(refusal);

        assertThatThrownBy(() -> caller.callAndAskForOneKey(PHONE, "¿Pregunta?", KEY_URL, EVENT_URL))
                .isInstanceOf(VoiceCallException.class)
                .hasMessage("Vonage answered 400 when creating a call")
                .hasNoCause();
    }

    @Test
    void turnsANetworkErrorIntoAVoiceCallExceptionWithoutTheNumber() {
        when(voiceClient.createCall(any(Call.class))).thenThrow(new VonageClientException("Could not reach " + PHONE));

        assertThatThrownBy(() -> caller.callAndAskForOneKey(PHONE, "¿Pregunta?", KEY_URL, EVENT_URL))
                .isInstanceOf(VoiceCallException.class)
                .hasMessage("Could not reach Vonage to create a call")
                .hasNoCause();
    }
}
