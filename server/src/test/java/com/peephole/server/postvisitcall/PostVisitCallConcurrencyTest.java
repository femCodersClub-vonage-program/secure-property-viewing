package com.peephole.server.postvisitcall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.VoiceCaller;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

// No test transaction on purpose: each check needs its own transactions, as when two servers run it at once
@SpringBootTest(properties = "app.server-public-url=https://peephole.example")
class PostVisitCallConcurrencyTest {

    private static final int CHECKS = 4;

    @Autowired
    private PostVisitCallDialer dialer;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private VoiceCaller voiceCaller;

    // 11:45 in Madrid, when the call of the fixture's visit is due
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-23T10:45:00Z"), ZoneOffset.UTC);
    }

    private PostVisitCallFixtures fixtures;
    private long agencyId;
    private long visitId;

    @BeforeEach
    void createAVisitWhoseCallIsDue() {
        fixtures = new PostVisitCallFixtures(jdbcTemplate);
        agencyId = fixtures.createAgency();
        visitId = fixtures.createJoinedVisit(agencyId, OffsetDateTime.parse("2026-11-23T11:00:00+01:00"));
        when(voiceCaller.callAndAskForOneKey(anyString(), anyString(), any(), any()))
                .thenReturn("63f61863-4a51-4f6b-86e1-46edebcf9356");
    }

    @AfterEach
    void deleteTheVisit() {
        fixtures.deleteAgencyAndItsVisits(agencyId);
    }

    @Test
    void commitsTheCallBeforeCallingVonageSoTheWebhooksFindIt() throws Exception {
        AtomicReference<List<String>> seenFromAnotherConnection = new AtomicReference<>();
        ExecutorService webhook = Executors.newSingleThreadExecutor();
        try {
            when(voiceCaller.callAndAskForOneKey(anyString(), anyString(), any(), any()))
                    .thenAnswer(call -> {
                        seenFromAnotherConnection.set(webhook.submit(() -> jdbcTemplate.queryForList(
                                        "SELECT status FROM post_visit_call WHERE visit_id = ?", String.class, visitId))
                                .get(10, TimeUnit.SECONDS));
                        return "63f61863-4a51-4f6b-86e1-46edebcf9356";
                    });

            dialer.callDueVisits();
        } finally {
            webhook.shutdownNow();
        }

        assertThat(seenFromAnotherConnection.get()).containsExactly("CALLING");
    }

    @Test
    void placesOneCallWhenSeveralChecksRunAtTheSameTime() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(CHECKS);
        try {
            List<Future<?>> checks = new ArrayList<>();
            for (int i = 0; i < CHECKS; i++) {
                checks.add(executor.submit(() -> {
                    start.await();
                    dialer.callDueVisits();
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> check : checks) {
                check.get(30, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        verify(voiceCaller, times(1)).callAndAskForOneKey(anyString(), anyString(), any(), any());
        Integer calls = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM post_visit_call WHERE visit_id = ?", Integer.class, visitId);
        assertThat(calls).isEqualTo(1);
    }
}
