package com.peephole.server.videovisit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.videovisit.dto.RoomLinkResponse;
import com.peephole.server.videovisit.dto.VideoTokenResponse;
import com.peephole.server.vonage.VideoProvider;
import com.peephole.server.vonage.VideoProviderException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

// No test transaction on purpose: each request needs its own transaction, as in production
@SpringBootTest
class VideoVisitConcurrencyTest {

    private static final int REQUESTS = 8;

    @Autowired
    private VideoVisitService service;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private VideoProvider videoProvider;

    @MockitoSpyBean
    private VideoAccessRepository accessRepository;

    // 10:55 in Madrid, while the room of the fixture's visit is open
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-23T09:55:00Z"), ZoneOffset.UTC);
    }

    private VideoVisitFixtures fixtures;
    private long agencyId;
    private long visitId;

    @BeforeEach
    void createAConfirmedVisit() {
        fixtures = new VideoVisitFixtures(jdbcTemplate);
        agencyId = fixtures.createAgency();
        visitId = fixtures.createVisit(agencyId, "CONFIRMED");
        when(videoProvider.applicationId()).thenReturn("application-id");
        when(videoProvider.generateToken(anyString(), anyString(), any())).thenReturn("jwt");
    }

    @AfterEach
    void deleteTheVisit() {
        fixtures.deleteAgencyAndItsVisits(agencyId);
    }

    @Test
    void neverCreatesMoreThanFourGuestLinksEvenAtTheSameTime() throws Exception {
        // One link left, so the race shows up even when the test connection pool lets only a few requests run at once
        for (int i = 0; i < 3; i++) {
            service.createRoomLink(visitId, VideoRole.GUEST);
        }
        // A slow count: without the row lock, every request would count the links before any of them saves its own.
        // A repository is a proxy of an interface, so callRealMethod can't reach it: the spy's default answer does
        Answer<?> realRepository =
                mockingDetails(accessRepository).getMockCreationSettings().getDefaultAnswer();
        doAnswer(invocation -> {
                    Object count = realRepository.answer(invocation);
                    Thread.sleep(200);
                    return count;
                })
                .when(accessRepository)
                .countByVisitIdAndRole(anyLong(), any());

        List<Boolean> results = runTogether(() -> {
            try {
                service.createRoomLink(visitId, VideoRole.GUEST);
                return true;
            } catch (VideoInviteLimitReachedException exception) {
                return false;
            }
        });

        assertThat(results).filteredOn(created -> created).hasSize(1);
        assertThat(countLinks("GUEST")).isEqualTo(4);
    }

    @Test
    void replacesTheVisitorLinkOneRequestAtATimeEvenWhenTheyArriveTogether() throws Exception {
        // A slow delete: without the row lock, every request would delete before any of them inserts, and all but
        // one would hit the one-visitor index
        Answer<?> realRepository =
                mockingDetails(accessRepository).getMockCreationSettings().getDefaultAnswer();
        doAnswer(invocation -> {
                    Object result = realRepository.answer(invocation);
                    Thread.sleep(200);
                    return result;
                })
                .when(accessRepository)
                .deleteByVisitIdAndRole(anyLong(), any());

        List<RoomLinkResponse> responses = runTogether(() -> service.createRoomLink(visitId, VideoRole.VISITOR));

        assertThat(responses).hasSize(REQUESTS);
        assertThat(countLinks("VISITOR")).isEqualTo(1);
    }

    @Test
    void createsTheSessionOnTheNextEntryAfterVonageFails() {
        when(videoProvider.createSession())
                .thenThrow(new VideoProviderException("Vonage answered 500"))
                .thenReturn("session-after-retry");

        assertThatThrownBy(() -> service.videoTokenForAgency(visitId, agencyId))
                .isInstanceOf(IllegalStateException.class);
        VideoTokenResponse response = service.videoTokenForAgency(visitId, agencyId);

        assertThat(response.sessionId()).isEqualTo("session-after-retry");
        String savedSession =
                jdbcTemplate.queryForObject("SELECT video_session_id FROM visit WHERE id = ?", String.class, visitId);
        assertThat(savedSession).isEqualTo("session-after-retry");
    }

    @Test
    void givesTheSameSessionToEveryoneWhoEntersAtTheSameTime() throws Exception {
        // A slow Vonage: without the row lock, every entry would see no session and create its own
        AtomicInteger created = new AtomicInteger();
        when(videoProvider.createSession()).thenAnswer(invocation -> {
            Thread.sleep(200);
            return "session-" + created.incrementAndGet();
        });

        List<VideoTokenResponse> responses = runTogether(() -> service.videoTokenForAgency(visitId, agencyId));

        assertThat(responses).extracting(VideoTokenResponse::sessionId).containsOnly("session-1");
        verify(videoProvider, times(1)).createSession();
    }

    private <T> List<T> runTogether(Callable<T> request) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(REQUESTS);
        CountDownLatch startTogether = new CountDownLatch(1);
        List<Future<T>> futures = new ArrayList<>();
        for (int i = 0; i < REQUESTS; i++) {
            futures.add(executor.submit(() -> {
                startTogether.await();
                return request.call();
            }));
        }
        startTogether.countDown();

        List<T> results = new ArrayList<>();
        for (Future<T> future : futures) {
            results.add(future.get(30, TimeUnit.SECONDS));
        }
        executor.shutdown();
        return results;
    }

    private int countLinks(String role) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM video_access WHERE visit_id = ? AND role = ?", Integer.class, visitId, role);
        return count == null ? 0 : count;
    }
}
