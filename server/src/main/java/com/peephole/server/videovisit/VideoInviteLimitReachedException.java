package com.peephole.server.videovisit;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VideoInviteLimitReachedException extends BusinessException {
    VideoInviteLimitReachedException(int limit) {
        super(
                HttpStatus.CONFLICT,
                "VIDEO_INVITE_LIMIT_REACHED",
                "This visit already has " + limit + " guest links, the most it can have.");
    }
}
