<?php

return [
    // Optional verification: enable only after transactional email delivery is configured and tested.
    'email_verification_enabled' => env('COMMUNITY_EMAIL_VERIFICATION_ENABLED', false),

    // Enable only after a moderator takes responsibility for checking the queue.
    'reports_enabled' => env('COMMUNITY_REPORTS_ENABLED', false),
];
