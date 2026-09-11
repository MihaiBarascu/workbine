<?php

return [
    // The private Dokploy overlay used by this deployment. Override if it changes.
    'proxies' => env('TRUSTED_PROXIES', '10.0.1.0/24'),
];
