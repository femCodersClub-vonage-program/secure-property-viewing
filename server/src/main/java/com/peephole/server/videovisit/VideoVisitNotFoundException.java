package com.peephole.server.videovisit;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VideoVisitNotFoundException extends BusinessException {
    VideoVisitNotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", "This visit was not found.");
    }
}
