<?php

namespace App\Support;

use Illuminate\Database\Connection;
use Illuminate\Support\Str;

class Usernames
{
    private const RESERVED = [
        'account', 'accounts', 'admin', 'administrator', 'api', 'auth',
        'contact', 'help', 'login', 'logout', 'members', 'moderator',
        'official', 'register', 'root', 'security', 'settings', 'staff',
        'support', 'system', 'workbine', 'www',
    ];

    public static function normalize(string $username): string
    {
        return Str::lower(trim($username));
    }

    public static function isValid(string $username): bool
    {
        return preg_match('/\A[a-z][a-z0-9-]{2,29}\z/', $username) === 1
            && ! in_array($username, self::RESERVED, true);
    }

    public static function base(string $displayName): string
    {
        // Some identity providers supply an email as the display name.
        $base = str_contains($displayName, '@') ? '' : Str::slug($displayName);
        $base = substr($base, 0, 30);

        return self::isValid($base) ? $base : 'member';
    }

    public static function generate(Connection $connection, string $displayName): string
    {
        $base = rtrim(substr(self::base($displayName), 0, 21), '-');

        do {
            // Independent registrations do not compete for the same bare name.
            $username = $base.'-'.Str::lower(Str::random(8));
        } while ($connection->table('users')->where('username', $username)->exists());

        return $username;
    }
}
