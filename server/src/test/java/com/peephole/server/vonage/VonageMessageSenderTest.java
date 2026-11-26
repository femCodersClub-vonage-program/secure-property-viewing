package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jayway.jsonpath.JsonPath;
import com.vonage.client.VonageClientException;
import com.vonage.client.messages.MessageRequest;
import com.vonage.client.messages.MessageResponse;
import com.vonage.client.messages.MessageResponseException;
import com.vonage.client.messages.MessagesClient;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VonageMessageSenderTest {

    private static final String FROM = "Peephole";
    private static final String PHONE = "+34600000001";
    private static final String TEXT = "Peephole: your video visit for Bright flat is confirmed for 1 Jan at 15:00.";
    private static final String MESSAGE_UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";

    @Mock
    private MessagesClient messagesClient;

    private VonageMessageSender sender;

    @BeforeEach
    void setUp() {
        sender = new VonageMessageSender(messagesClient, FROM);
    }

    @Test
    void sendsAnSmsFromTheSenderWithOurMessageIdAsClientRef() {
        MessageResponse response = mock(MessageResponse.class);
        when(response.getMessageUuid()).thenReturn(UUID.fromString(MESSAGE_UUID));
        when(messagesClient.sendMessage(any())).thenReturn(response);

        assertThat(sender.sendSms(PHONE, TEXT, "42")).isEqualTo(MESSAGE_UUID);

        ArgumentCaptor<MessageRequest> request = ArgumentCaptor.forClass(MessageRequest.class);
        verify(messagesClient).sendMessage(request.capture());
        String json = request.getValue().toJson();
        assertThat((String) JsonPath.read(json, "$.channel")).isEqualTo("sms");
        assertThat((String) JsonPath.read(json, "$.message_type")).isEqualTo("text");
        assertThat((String) JsonPath.read(json, "$.from")).isEqualTo(FROM);
        // Vonage takes the number without the plus sign
        assertThat((String) JsonPath.read(json, "$.to")).isEqualTo("34600000001");
        assertThat((String) JsonPath.read(json, "$.text")).isEqualTo(TEXT);
        assertThat((String) JsonPath.read(json, "$.client_ref")).isEqualTo("42");
    }

    @ParameterizedTest
    @ValueSource(ints = {429, 500, 503})
    void treatsARateLimitOrAnErrorOnVonagesSideAsTemporary(int status) {
        MessageResponseException error = apiError(status);
        when(messagesClient.sendMessage(any())).thenThrow(error);

        assertThatThrownBy(() -> sender.sendSms(PHONE, TEXT, "42"))
                .isInstanceOfSatisfying(
                        MessageSendException.class,
                        exception -> assertThat(exception.isTemporary()).isTrue())
                .hasMessage("Vonage answered " + status + " when sending message 42")
                .hasNoCause();
    }

    @ParameterizedTest
    @ValueSource(ints = {400, 401, 402, 422})
    void treatsAnyOtherRefusalAsPermanent(int status) {
        MessageResponseException error = apiError(status);
        when(messagesClient.sendMessage(any())).thenThrow(error);

        assertThatThrownBy(() -> sender.sendSms(PHONE, TEXT, "42"))
                .isInstanceOfSatisfying(
                        MessageSendException.class,
                        exception -> assertThat(exception.isTemporary()).isFalse())
                .hasNoCause();
    }

    @Test
    void treatsANetworkErrorAsTemporaryWithoutTheNumber() {
        when(messagesClient.sendMessage(any())).thenThrow(new VonageClientException("Could not reach " + PHONE));

        assertThatThrownBy(() -> sender.sendSms(PHONE, TEXT, "42"))
                .isInstanceOfSatisfying(
                        MessageSendException.class,
                        exception -> assertThat(exception.isTemporary()).isTrue())
                .hasMessage("Could not reach Vonage to send message 42")
                .hasNoCause();
    }

    private static MessageResponseException apiError(int status) {
        MessageResponseException exception = mock(MessageResponseException.class);
        when(exception.getStatusCode()).thenReturn(status);
        return exception;
    }
}
