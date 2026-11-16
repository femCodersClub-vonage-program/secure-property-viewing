package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

public class PhoneHasherTest {
    private static final String PHONE = "+34600000000";

    private final PhoneHasher hasher = new PhoneHasher("test-secret");

    @Test
    void returnsTheSameHashForTheSamePhone() {
        assertThat(hasher.hash(PHONE)).isEqualTo(hasher.hash(PHONE));
    }

    @Test
    void returnsDifferentHashesForDifferentPhones() {
        assertThat(hasher.hash(PHONE)).isNotEqualTo(hasher.hash("+34600000001"));
    }

    @Test
    void dependsOnTheSecret() {
        PhoneHasher otherSecret = new PhoneHasher("another-secret");

        assertThat(otherSecret.hash(PHONE)).isNotEqualTo(hasher.hash(PHONE));
    }

    @Test
    void neverContainsThePhoneNumber() {
        String hash = hasher.hash(PHONE);

        assertThat(hash).hasSize(64).doesNotContain("600000000");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    void rejectsAMissingSecret(String secret) {
        assertThatThrownBy(() -> new PhoneHasher(secret)).isInstanceOf(IllegalArgumentException.class);
    }
}
