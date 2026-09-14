<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class UserBlockController extends Controller
{
    public function store(Request $request, string $username): RedirectResponse
    {
        $other = $this->other($request, $username);
        UserBlock::query()->firstOrCreate([
            'blocker_id' => $request->user()->id,
            'blocked_id' => $other->id,
        ]);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member blocked. They can no longer message you.')]);

        return back();
    }

    public function destroy(Request $request, string $username): RedirectResponse
    {
        $other = $this->other($request, $username);
        UserBlock::query()->where('blocker_id', $request->user()->id)->where('blocked_id', $other->id)->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member unblocked.')]);

        return back();
    }

    private function other(Request $request, string $username): User
    {
        $other = User::query()->where('username', Str::lower($username))->firstOrFail();
        abort_if($other->id === $request->user()->id, 404);

        return $other;
    }
}
