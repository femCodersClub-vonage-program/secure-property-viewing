package com.peephole.server.message;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

// The texts of specs/messages.md, in English like the interface and with times in Madrid
final class MessageTexts {

    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);

    private MessageTexts() {}

    static String visitConfirmation(String title, OffsetDateTime startsAt) {
        ZonedDateTime inMadrid = startsAt.atZoneSameInstant(MADRID);
        return "Peephole: your video visit for " + title + " is confirmed for " + DAY.format(inMadrid) + " at "
                + TIME.format(inMadrid) + ".";
    }

    static String listingRequestReceived(String title) {
        return "Peephole: we have received your request for " + title
                + ". The agency will review it and text you with its decision.";
    }

    static String listingRequestApproved(String title) {
        return "Peephole: your property " + title + " has been approved and is now published.";
    }

    // The rejection reason is never sent: the agency writes it for the dashboard
    static String listingRequestRejected(String title) {
        return "Peephole: your request for " + title + " has not been approved.";
    }
}
