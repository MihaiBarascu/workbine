<?php

return [
    // Enable only after the public domain, credentials and spending alerts are ready.
    'enabled' => (bool) env('MEDIA_ENABLED', false),
    'disk' => env('MEDIA_DISK', 'r2'),
    'max_upload_kb' => 5120,
    'max_pixels' => 16000000,
    'avatar_dimension' => 512,
    'evidence_dimension' => 1600,
    'max_image_bytes' => 1048576,
    'user_quota_bytes' => 52428800,
    'uploads_per_hour' => 10,
    'uploads_per_day' => 30,
    'global_uploads_per_day' => 500,
];
