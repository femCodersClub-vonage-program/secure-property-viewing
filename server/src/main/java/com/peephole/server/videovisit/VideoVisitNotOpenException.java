package com.peephole.server.videovisit;

import com.peephole.server.common.BusinessException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.http.HttpStatus;

class VideoVisitNotOpenException extends BusinessException {

    private final OffsetDateTime opensAt;

    private VideoVisitNotOpenException(String message, OffsetDateTime opensAt) {
        super(HttpStatus.CONFLICT, "VIDEO_VISIT_NOT_OPEN", message);
        this.opensAt = opensAt;
    }

    static VideoVisitNotOpenException notYet(OffsetDateTime opensAt, Duration opensBefore) {
        return new VideoVisitNotOpenException(
                "The room opens " + opensBefore.toMinutes() + " minutes before the visit. Come back then.", opensAt);
    }

    static VideoVisitNotOpenException over() {
        return new VideoVisitNotOpenException("This visit has ended or was canceled, so its room is closed.", null);
    }

    @Override
    public Map<String, Object> getProperties() {
        return opensAt == null ? Map.of() : Map.of("opensAt", opensAt);
    }
}
