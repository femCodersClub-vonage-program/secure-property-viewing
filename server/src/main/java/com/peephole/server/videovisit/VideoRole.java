package com.peephole.server.videovisit;

// Room links are only VISITOR or GUEST. AGENCY enters signed in, without a link
enum VideoRole {
    VISITOR,
    GUEST,
    AGENCY
}
