<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable()->unique();
        });

        // Query-builder updates preserve authentication data and timestamps.
        DB::table('users')->select(['id', 'name'])->orderBy('id')->chunkById(500, function ($users) {
            foreach ($users as $user) {
                $username = $this->usernameFor($user->name);
                DB::table('users')->where('id', $user->id)->update(['username' => $username]);
            }
        });

        // Keep the column nullable during rolling deploys: an older application
        // container can still insert users until the new container takes over.
        // New code assigns usernames on creation and repairs these overlap rows.
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }

    private function usernameFor(string $displayName): string
    {
        // Freeze the backfill rules here so future username policy changes do
        // not change what this historical migration writes on a fresh database.
        $reserved = [
            'account', 'accounts', 'admin', 'administrator', 'api', 'auth',
            'contact', 'help', 'login', 'logout', 'members', 'moderator',
            'official', 'register', 'root', 'security', 'settings', 'staff',
            'support', 'system', 'workbine', 'www',
        ];
        $base = str_contains($displayName, '@') ? '' : substr(Str::slug($displayName), 0, 30);

        if (preg_match('/\A[a-z][a-z0-9-]{2,29}\z/', $base) !== 1 || in_array($base, $reserved, true)) {
            $base = 'member';
        }

        for ($number = 1; ; $number++) {
            $suffix = $number === 1 ? '' : '-'.$number;
            $candidate = rtrim(substr($base, 0, 30 - strlen($suffix)), '-').$suffix;

            if (! DB::table('users')->where('username', $candidate)->exists()) {
                return $candidate;
            }
        }
    }
};
