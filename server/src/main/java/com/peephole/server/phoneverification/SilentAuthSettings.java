package com.peephole.server.phoneverification;

// The Silent Authentication settings from application.properties (specs/silent-authentication.md). virtualOperator
// is only true while Silent Authentication is on, so +990 numbers are never accepted without it
record SilentAuthSettings(boolean enabled, boolean virtualOperator, String redirectUrl) {

    static final SilentAuthSettings OFF = new SilentAuthSettings(false, false, "");
}
