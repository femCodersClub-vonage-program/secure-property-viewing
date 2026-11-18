package com.peephole.server.videovisit;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class RoomLinkNotFoundException extends BusinessException {
    RoomLinkNotFoundException() {
        super(
                HttpStatus.NOT_FOUND,
                "NOT_FOUND",
                "This room link is not valid. Ask the person who invited you for a new one.");
    }
}
