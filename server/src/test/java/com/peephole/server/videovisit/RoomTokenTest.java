package com.peephole.server.videovisit;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RoomTokenTest {

    @Test
    void generatesUrlSafeTokensOf32RandomBytes() {
        String token = RoomToken.generate();

        // 32 bytes in base64url without padding are 43 characters
        assertThat(token).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void neverRepeatsAToken() {
        Set<String> tokens = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            tokens.add(RoomToken.generate());
        }

        assertThat(tokens).hasSize(1000);
    }

    @Test
    void hashesWithSha256AsHex() {
        // SHA-256 of "abc", from the FIPS 180-2 test vectors
        assertThat(RoomToken.hash("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
