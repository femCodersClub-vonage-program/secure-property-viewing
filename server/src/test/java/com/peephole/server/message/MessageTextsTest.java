package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class MessageTextsTest {

    @Test
    void writesTheConfirmationWithTheDayAndTimeInMadrid() {
        assertThat(MessageTexts.visitConfirmation("Bright test flat", OffsetDateTime.parse("2099-01-01T14:00:00Z")))
                .isEqualTo(
                        "Peephole: your video visit for Bright test flat is confirmed for Thursday 1 January at 15:00.");
    }

    @Test
    void usesSummerTimeInMadrid() {
        assertThat(MessageTexts.visitConfirmation("Bright test flat", OffsetDateTime.parse("2099-07-01T13:00:00Z")))
                .isEqualTo(
                        "Peephole: your video visit for Bright test flat is confirmed for Wednesday 1 July at 15:00.");
    }

    @Test
    void writesTheThreeListingRequestMessagesOfTheSpec() {
        assertThat(MessageTexts.listingRequestReceived("Apartment in Gràcia"))
                .isEqualTo("Peephole: we have received your request for Apartment in Gràcia."
                        + " The agency will review it and text you with its decision.");
        assertThat(MessageTexts.listingRequestApproved("Apartment in Gràcia"))
                .isEqualTo("Peephole: your property Apartment in Gràcia has been approved and is now published.");
        assertThat(MessageTexts.listingRequestRejected("Apartment in Gràcia"))
                .isEqualTo("Peephole: your request for Apartment in Gràcia has not been approved.");
    }
}
