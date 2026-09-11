<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class UserSessions
{
    public function revoke(User $user, ?string $exceptSession = null): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        // Include sessions created before password-hash authentication was enabled.
        $sessions = DB::connection(config('session.connection'))
            ->table(config('session.table'))
            ->where('user_id', $user->getAuthIdentifier());

        if ($exceptSession !== null) {
            $sessions->where('id', '!=', $exceptSession);
        }

        $sessions->delete();
    }
}
