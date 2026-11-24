package com.peephole.server.phoneverification;

// The step a pending verification is on, and the channel that verified it once it is VERIFIED
enum PhoneVerificationChannel {
    SMS,
    SILENT_AUTH
}
