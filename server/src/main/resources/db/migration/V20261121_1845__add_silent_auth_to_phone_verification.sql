-- Silent Authentication (specs/silent-authentication.md). channel is the step a pending verification is on, and the
-- channel that verified it once it is VERIFIED. sms_fallback is false for +990 numbers, which have no SMS step.
-- The defaults keep every existing verification as SMS
ALTER TABLE phone_verification
    ADD COLUMN channel      VARCHAR(20) NOT NULL DEFAULT 'SMS' CHECK (channel IN ('SMS', 'SILENT_AUTH')),
    ADD COLUMN sms_fallback BOOLEAN     NOT NULL DEFAULT TRUE;
