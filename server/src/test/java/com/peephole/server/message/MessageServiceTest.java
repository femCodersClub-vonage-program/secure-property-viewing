package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.IllegalTransactionStateException;

@SpringBootTest
class MessageServiceTest {

    @Autowired
    private MessageService messageService;

    // A message is saved in the transaction of the booking or review that creates it, so a failure in either undoes
    // both (specs/messages.md)
    @Test
    void onlySavesAMessageInsideTheCallersTransaction() {
        assertThatThrownBy(() -> messageService.scheduleVisitConfirmation(1L, OffsetDateTime.now()))
                .isInstanceOf(IllegalTransactionStateException.class);
    }
}
