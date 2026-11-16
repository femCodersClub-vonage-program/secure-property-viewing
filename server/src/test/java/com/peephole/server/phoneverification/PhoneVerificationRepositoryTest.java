package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PhoneVerificationRepositoryTest {

    // Far in the future, so the demo data never falls inside the counted hour
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2099-01-01T12:00:00Z");

    @Autowired
    private PhoneVerificationRepository repository;

    @Test
    void savesANewVerificationAsPending() {
        PhoneVerification saved = repository.save(verification("hash-a", NOW));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(PhoneVerificationStatus.PENDING);
        assertThat(saved.getCheckAttempts()).isZero();
    }

    @Test
    void countsOnlyTheVerificationsOfThePhoneInTheLastHour() {
        repository.save(verification("hash-a", NOW.minusMinutes(70)));
        repository.save(verification("hash-a", NOW.minusMinutes(10)));
        repository.save(verification("hash-b", NOW.minusMinutes(5)));

        assertThat(repository.countByPhoneHashAndCreatedAtAfter("hash-a", NOW.minusHours(1)))
                .isEqualTo(1);
    }

    @Test
    void countsTheVerificationsOfEveryPhoneInTheLastHour() {
        repository.save(verification("hash-a", NOW.minusMinutes(70)));
        repository.save(verification("hash-a", NOW.minusMinutes(10)));
        repository.save(verification("hash-b", NOW.minusMinutes(5)));

        assertThat(repository.countByCreatedAtAfter(NOW.minusHours(1))).isEqualTo(2);
    }

    private static PhoneVerification verification(String phoneHash, OffsetDateTime createdAt) {
        return new PhoneVerification(PhoneVerificationPurpose.VISIT, phoneHash, "request-id", createdAt);
    }
}
