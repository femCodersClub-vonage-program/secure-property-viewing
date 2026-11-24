package com.peephole.server.postvisitcall;

import java.util.Optional;

// The texts of the call, in Spanish, as specs/post-visit-call.md lists them. The call reaches a Spanish mobile with
// no screen to fall back on, so it speaks the visitor's language
final class PostVisitCallTexts {

    static final String QUESTION = "Hola, te llamamos de Peephole por la videovisita que acabas de hacer. Si alguien"
            + " te ha pedido dinero, una señal o cualquier pago antes de firmar el contrato, pulsa 1. Si no, pulsa 2.";

    static final String ASKED_FOR_MONEY =
            "Gracias. Hemos avisado a la agencia. No hagas ningún pago antes de firmar el contrato.";

    static final String NOT_ASKED = "Gracias por tu respuesta. Que vaya muy bien la búsqueda.";

    static final String NO_VALID_KEY = "No hemos recibido tu respuesta. Gracias y hasta pronto.";

    private PostVisitCallTexts() {}

    static String closing(Optional<PostVisitCallAnswer> answer) {
        return answer.map(found -> switch (found) {
                    case ASKED_FOR_MONEY -> ASKED_FOR_MONEY;
                    case NOT_ASKED -> NOT_ASKED;
                })
                .orElse(NO_VALID_KEY);
    }
}
