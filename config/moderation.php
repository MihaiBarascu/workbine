<?php

return [
    'enabled' => (bool) env('CONTENT_MODERATION_ENABLED', false),
    'admin_user_ids' => array_filter(array_map('trim', explode(',', (string) env('MODERATION_ADMIN_USER_IDS', '')))),
    'api_key' => env('OPENAI_API_KEY'),
    'model' => 'omni-moderation-latest',
    // Changing this invalidates previous approvals for the old policy.
    'policy' => 'workbine-v1',
    'review_days' => 30,
    'reviews_per_user' => 20,
    // Broad discussion of health, recovery or violence is not itself prohibited.
    'review_categories' => [
        'sexual', 'sexual/minors', 'violence/graphic', 'hate',
        'hate/threatening', 'harassment/threatening', 'illicit/violent',
        'self-harm/instructions',
    ],
];
