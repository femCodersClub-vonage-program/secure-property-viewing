package com.peephole.server.postvisitcall;

import java.util.Optional;

enum PostVisitCallAnswer {
    ASKED_FOR_MONEY,
    NOT_ASKED;

    // 1 and 2 are the only keys the question offers; anything else records no answer
    static Optional<PostVisitCallAnswer> fromKey(String digits) {
        return switch (digits) {
            case "1" -> Optional.of(ASKED_FOR_MONEY);
            case "2" -> Optional.of(NOT_ASKED);
            default -> Optional.empty();
        };
    }
}
