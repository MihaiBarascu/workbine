<?php

namespace Tests\Feature\Auth;

use App\Models\MediaImage;
use App\Models\User;
use App\Services\UserSessions;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordSessionRevocationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['session.driver' => 'database', 'session.lottery' => [0, 100]]);
    }

    private function browserSession(string $id): void
    {
        // Each request is a different browser cookie jar; discard cached guard/session instances.
        Auth::forgetGuards();
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        $this->withCookie(config('session.cookie'), $id);
    }

    private function sessionFor(User $user, bool $withPasswordHash = true): string
    {
        $id = bin2hex(random_bytes(20));
        $payload = [Auth::guard()->getName() => $user->id];
        if ($withPasswordHash) {
            $payload['password_hash_web'] = $user->getAuthPassword();
        }
        DB::table('sessions')->insert([
            'id' => $id, 'user_id' => $user->id,
            'payload' => base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)),
            'last_activity' => time(),
        ]);

        return $id;
    }

    public function test_password_reset_revokes_old_sessions_and_remember_token_without_touching_other_members(): void
    {
        $user = User::factory()->unverified()->create(['remember_token' => 'previous-remember-token']);
        $old = $this->sessionFor($user);
        $legacy = $this->sessionFor($user, false);
        $other = $this->sessionFor(User::factory()->create());
        $token = Password::broker()->createToken($user);

        $this->browserSession(bin2hex(random_bytes(20)));
        $this->post(route('password.update'), [
            'email' => $user->email, 'token' => $token,
            'password' => 'recovered-password-27', 'password_confirmation' => 'recovered-password-27',
        ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $this->assertDatabaseMissing('sessions', ['id' => $old]);
        $this->assertDatabaseMissing('sessions', ['id' => $legacy]);
        $this->assertDatabaseHas('sessions', ['id' => $other]);
        $this->assertTrue(Hash::check('recovered-password-27', $user->fresh()->password));
        $this->assertNotSame('previous-remember-token', $user->fresh()->remember_token);
        $this->assertNull($user->fresh()->email_verified_at);

        foreach ([$old, $legacy] as $staleSession) {
            $this->browserSession($staleSession);
            $this->get(route('profile.edit'))->assertRedirect(route('login'));
        }
        $this->browserSession($other);
        $this->get(route('profile.edit'))->assertOk();
    }

    public function test_settings_password_change_preserves_current_session_and_revokes_other_devices(): void
    {
        $user = User::factory()->create();
        $current = $this->sessionFor($user);
        $legacy = $this->sessionFor($user, false);
        $other = $this->sessionFor(User::factory()->create());

        $this->browserSession($current);
        $this->from(route('security.edit'))->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'updated-password-27', 'password_confirmation' => 'updated-password-27',
        ])->assertSessionHasNoErrors()->assertRedirect(route('security.edit'));

        $this->assertDatabaseHas('sessions', ['id' => $current, 'user_id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['id' => $legacy]);
        $this->assertDatabaseHas('sessions', ['id' => $other]);

        $this->browserSession($current);
        $this->get(route('profile.edit'))->assertOk();
        $this->browserSession($legacy);
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->browserSession($other);
        $this->get(route('profile.edit'))->assertOk();
    }

    public function test_password_hash_mismatch_logs_out_a_session_when_password_changes_elsewhere(): void
    {
        $user = User::factory()->create();
        $session = $this->sessionFor($user);
        $user->update(['password' => 'changed-outside-this-session']);

        $this->browserSession($session);
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_invalid_reset_token_does_not_revoke_any_sessions(): void
    {
        $user = User::factory()->create();
        $session = $this->sessionFor($user);

        $this->browserSession(bin2hex(random_bytes(20)));
        $this->post(route('password.update'), [
            'email' => $user->email, 'token' => 'invalid-reset-token',
            'password' => 'attempted-password-27', 'password_confirmation' => 'attempted-password-27',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseHas('sessions', ['id' => $session, 'user_id' => $user->id]);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_revocation_uses_the_configured_session_connection_and_table(): void
    {
        config([
            'database.connections.recovery_sessions' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => ''],
            'session.connection' => 'recovery_sessions',
            'session.table' => 'recovery_sessions',
        ]);
        Schema::connection('recovery_sessions')->create('recovery_sessions', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->unsignedBigInteger('user_id');
        });
        $user = User::factory()->create();
        $other = User::factory()->create();
        $default = $this->sessionFor($user);
        $sessions = DB::connection('recovery_sessions')->table('recovery_sessions');
        $sessions->insert([
            ['id' => 'revoke-this', 'user_id' => $user->id],
            ['id' => 'keep-this', 'user_id' => $other->id],
        ]);

        app(UserSessions::class)->revoke($user);

        $this->assertFalse((clone $sessions)->where('id', 'revoke-this')->exists());
        $this->assertTrue((clone $sessions)->where('id', 'keep-this')->exists());
        $this->assertDatabaseHas('sessions', ['id' => $default]);
    }

    public function test_non_database_drivers_do_not_delete_unrelated_database_sessions(): void
    {
        $user = User::factory()->create();
        $session = $this->sessionFor($user);
        config(['session.driver' => 'array']);

        app(UserSessions::class)->revoke($user);

        $this->assertDatabaseHas('sessions', ['id' => $session]);
    }

    /** @return array<string, array{bool}> */
    public static function accountOwnership(): array
    {
        return ['verified account' => [true], 'unverified account' => [false]];
    }

    #[DataProvider('accountOwnership')]
    public function test_recovery_removes_preclaimed_credentials_only_for_unverified_accounts(bool $verified): void
    {
        $user = $verified ? User::factory()->create() : User::factory()->unverified()->create();
        $customAvatar = MediaImage::query()->create([
            'user_id' => $user->id, 'disk' => 'public', 'path' => 'images/recovery-test.webp',
            'bytes' => 10, 'width' => 2, 'height' => 2,
        ]);
        $user->forceFill([
            'google_id' => 'google-recovery-'.$user->id,
            'avatar' => 'https://example.com/provider-avatar.png',
            'avatar_image_id' => $customAvatar->id,
            'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
            'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-for-test'], JSON_THROW_ON_ERROR)),
            'two_factor_confirmed_at' => now(),
        ])->save();
        $originalSecret = $user->two_factor_secret;
        $originalRecoveryCodes = $user->two_factor_recovery_codes;
        $other = User::factory()->create();
        foreach ([$user, $other] as $owner) {
            DB::table('passkeys')->insert([
                'user_id' => $owner->id, 'name' => 'Previously enrolled key',
                'credential_id' => 'test-credential-'.$owner->id,
                'credential' => json_encode(['id' => 'test-credential-'.$owner->id], JSON_THROW_ON_ERROR),
            ]);
        }
        $token = Password::broker()->createToken($user);

        $this->browserSession(bin2hex(random_bytes(20)));
        $this->post(route('password.update'), [
            'email' => $user->email, 'token' => $token,
            'password' => 'recovered-password-27', 'password_confirmation' => 'recovered-password-27',
        ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $user->refresh();
        $this->assertSame($verified, $user->hasVerifiedEmail());
        $this->assertSame($customAvatar->id, $user->avatar_image_id);
        $this->assertDatabaseHas('passkeys', ['user_id' => $other->id]);
        if ($verified) {
            $this->assertSame('google-recovery-'.$user->id, $user->google_id);
            $this->assertSame('https://example.com/provider-avatar.png', $user->avatar);
            $this->assertDatabaseHas('passkeys', ['user_id' => $user->id]);
            $this->assertSame($originalSecret, $user->two_factor_secret);
            $this->assertSame($originalRecoveryCodes, $user->two_factor_recovery_codes);
            $this->assertNotNull($user->two_factor_confirmed_at);
        } else {
            $this->assertNull($user->google_id);
            $this->assertNull($user->avatar);
            $this->assertDatabaseMissing('passkeys', ['user_id' => $user->id]);
            $this->assertNull($user->two_factor_secret);
            $this->assertNull($user->two_factor_recovery_codes);
            $this->assertNull($user->two_factor_confirmed_at);
        }

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'recovered-password-27'])
            ->assertRedirect($verified ? route('two-factor.login') : route('dashboard', absolute: false));
    }
}
