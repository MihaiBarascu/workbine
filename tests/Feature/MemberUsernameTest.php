<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MemberUsernameTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_public_names_receive_unique_usernames_without_email_fragments(): void
    {
        $first = User::factory()->create(['name' => 'Ștefan Popescu', 'email' => 'private-identity@example.test']);
        $second = User::factory()->create(['name' => 'Ștefan Popescu']);
        $fallback = User::factory()->create(['name' => '🧑‍🔧', 'email' => 'another-private-identity@example.test']);

        foreach ([$first, $second, $fallback] as $user) {
            $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]{2,29}$/', $user->username);
            $this->assertStringNotContainsString('private', $user->username);
        }

        $this->assertStringStartsWith('stefan-popescu', $first->username);
        $this->assertNotSame($first->username, $second->username);
    }

    public function test_numeric_and_mixed_case_profile_links_redirect_to_current_username(): void
    {
        $user = User::factory()->create(['username' => 'mihai']);
        $target = route('members.show', ['username' => 'mihai', 'view' => 'topics', 'page' => 2]);

        $this->get('/members/'.$user->id.'?view=topics&page=2')->assertStatus(301)->assertRedirect($target);
        $this->get('/members/MiHaI?view=topics&page=2')->assertStatus(301)->assertRedirect($target);
        $this->get('/members/mihai')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('members/show')
            ->where('member.username', 'mihai')
            ->missing('member.email')
            ->missing('member.google_id'));
    }

    public function test_unknown_usernames_do_not_fall_back_to_numeric_ids(): void
    {
        User::factory()->create();

        $this->get('/members/missing-member')->assertNotFound();
        $this->get('/members/999999999')->assertNotFound();
        $this->get('/members/a_b')->assertNotFound();
        $this->get('/members/ab')->assertNotFound();
    }

    public function test_owner_can_change_username_and_numeric_link_follows_the_new_name(): void
    {
        $user = User::factory()->create(['username' => 'first-name']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => '  MiHaI-Works  ',
        ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

        $this->assertSame('mihai-works', $user->fresh()->username);
        $this->get('/members/first-name')->assertNotFound();
        $this->get('/members/'.$user->id.'?view=experiences&page=2')
            ->assertStatus(301)
            ->assertRedirect(route('members.show', ['username' => 'mihai-works', 'view' => 'experiences', 'page' => 2]));
        $this->get('/members/mihai-works')->assertOk();
    }

    public function test_display_name_and_other_profile_edits_do_not_regenerate_username(): void
    {
        $user = User::factory()->create(['username' => 'stable-handle']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => 'A different public name',
            'email' => $user->email,
        ])->assertSessionHasNoErrors();

        $this->assertSame('stable-handle', $user->fresh()->username);
        $this->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'STABLE-HANDLE',
        ])->assertSessionHasNoErrors();
        $this->assertSame('stable-handle', $user->fresh()->username);
    }

    public function test_duplicate_username_is_rejected_case_insensitively_without_partial_profile_updates(): void
    {
        $owner = User::factory()->create(['username' => 'already-taken']);
        $user = User::factory()->create(['username' => 'my-handle', 'bio' => 'Original bio']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => 'Changed name',
            'email' => $user->email,
            'username' => 'ALREADY-TAKEN',
            'bio' => 'Changed bio',
            'id' => $owner->id,
        ])->assertSessionHasErrors('username');

        $this->assertSame('my-handle', $user->fresh()->username);
        $this->assertSame('Original bio', $user->fresh()->bio);
        $this->assertSame('already-taken', $owner->fresh()->username);
    }

    #[DataProvider('invalidUsernames')]
    public function test_invalid_or_reserved_usernames_are_rejected(mixed $username): void
    {
        $user = User::factory()->create(['username' => 'valid-handle']);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => $username,
        ])->assertSessionHasErrors('username');

        $this->assertSame('valid-handle', $user->fresh()->username);
    }

    public static function invalidUsernames(): array
    {
        return array_map(fn ($value) => [$value], [
            '', null, [], 'ab', '12345', '1member', 'a_b', 'two words', 'mîhai',
            'a/../../b', str_repeat('a', 31), 'admin', 'support', 'workbine',
        ]);
    }

    public function test_username_changes_require_authentication(): void
    {
        $user = User::factory()->create(['username' => 'unchanged']);

        $this->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'hijacked',
        ])->assertRedirect(route('login'));

        $this->assertSame('unchanged', $user->fresh()->username);
    }

    public function test_database_rejects_duplicate_usernames_even_without_form_validation(): void
    {
        User::factory()->create(['username' => 'unique-handle']);
        $other = User::factory()->create();

        $this->expectException(UniqueConstraintViolationException::class);
        DB::transaction(fn () => DB::table('users')->where('id', $other->id)->update(['username' => 'unique-handle']));
    }

    public function test_losing_a_username_race_returns_a_field_error_and_rolls_back_other_changes(): void
    {
        $user = User::factory()->create(['username' => 'original-handle', 'bio' => 'Original bio']);
        $competitor = User::factory()->create();
        $listener = static function (User $saving) use ($competitor): void {
            if ($saving->username === 'racing-handle') {
                DB::table('users')->where('id', $competitor->id)->update(['username' => 'racing-handle']);
            }
        };
        User::updating($listener);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'racing-handle',
            'bio' => 'Should roll back',
        ])->assertSessionHasErrors('username');

        $this->assertSame('original-handle', $user->fresh()->username);
        $this->assertSame('Original bio', $user->fresh()->bio);
    }

    public function test_registration_and_google_login_create_public_usernames(): void
    {
        $this->post(route('register.store'), [
            'name' => 'New Member',
            'email' => 'hidden-login@example.test',
            'password' => 'password123!',
            'password_confirmation' => 'password123!',
        ])->assertSessionHasNoErrors();

        $registered = User::query()->where('email', 'hidden-login@example.test')->firstOrFail();
        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]{2,29}$/', $registered->username);
        $this->assertStringNotContainsString('hidden-login', $registered->username);
        $this->post(route('logout'));

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'username-google',
            'name' => null,
            'email' => 'private-google-identity@example.test',
            'email_verified' => true,
        ]));
        $this->get(route('google.callback'))->assertRedirect(route('home'));
        $google = User::query()->where('google_id', 'username-google')->firstOrFail();
        $this->assertSame('Member', $google->name);
        $this->assertStringStartsWith('member', $google->username);
        $this->assertStringNotContainsString('private-google-identity', $google->username);
    }

    public function test_public_contributions_include_canonical_author_usernames_without_private_fields(): void
    {
        $user = User::factory()->create(['username' => 'public-author']);
        $topic = Topic::factory()->create(['user_id' => $user->id]);
        $method = Method::factory()->create(['user_id' => $user->id, 'topic_id' => $topic->id]);
        Experience::query()->create(['user_id' => $user->id, 'method_id' => $method->id, 'outcome' => 'partly', 'body' => 'A useful outcome.']);

        $this->get(route('topics.index'))->assertInertia(fn (Assert $page) => $page
            ->where('topics.data.0.user.username', 'public-author')->missing('topics.data.0.user.email'));
        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page
            ->where('topic.user.username', 'public-author')
            ->where('methods.0.user.username', 'public-author')->missing('methods.0.user.email'));
        $this->get(route('experiences.index', [$topic, $method]))->assertInertia(fn (Assert $page) => $page
            ->where('method.user.username', 'public-author')
            ->where('experiences.data.0.user.username', 'public-author')->missing('experiences.data.0.user.email'));
    }

    public function test_legacy_null_usernames_are_repaired_without_changing_account_timestamps(): void
    {
        $user = User::factory()->create(['created_at' => '2024-01-10 12:00:00', 'updated_at' => '2024-02-10 12:00:00']);
        DB::table('users')->where('id', $user->id)->update(['username' => null]);
        $before = (array) DB::table('users')->find($user->id);
        $repaired = User::query()->findOrFail($user->id);
        $after = (array) DB::table('users')->find($user->id);

        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]{2,29}$/', $repaired->username);
        unset($before['username'], $after['username']);
        $this->assertSame($before, $after);
        $this->get('/members/'.$user->id)->assertRedirect(route('members.show', $repaired->username));
    }

    public function test_migration_backfills_existing_accounts_without_changing_other_fields_and_can_roll_back(): void
    {
        $names = ['Ștefan Popescu', 'Ștefan Popescu', 'admin', '1234', '🧑‍🔧', 'private-login@example.test', str_repeat('Very long name ', 8), str_repeat('Very long name ', 8)];
        foreach ($names as $name) {
            User::factory()->create([
                'name' => $name,
                'google_id' => 'legacy-'.DB::table('users')->count(),
                'bio' => 'Existing introduction',
                'created_at' => '2024-01-10 12:00:00',
                'updated_at' => '2024-02-10 12:00:00',
            ]);
        }

        $migration = require database_path('migrations/2026_09_11_120000_add_usernames_to_users.php');
        $migration->down();
        $this->assertFalse(Schema::hasColumn('users', 'username'));
        $before = DB::table('users')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $migration->up();
        $after = DB::table('users')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        $usernames = array_column($after, 'username');

        $this->assertCount(count($names), array_unique($usernames));
        $this->assertSame('stefan-popescu', $usernames[0]);
        $this->assertSame('stefan-popescu-2', $usernames[1]);
        $this->assertSame('member', $usernames[2]);
        foreach ($usernames as $username) {
            $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]{2,29}$/', $username);
            $this->assertStringNotContainsString('private-login', $username);
        }
        foreach ($after as &$row) {
            unset($row['username']);
        }
        unset($row);
        $this->assertSame($before, $after);
        $migration->down();
        $this->assertSame($before, DB::table('users')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all());
        $migration->up();
    }

    public function test_previous_usernames_can_be_used_by_another_member(): void
    {
        $first = User::factory()->create(['username' => 'released-name']);
        $second = User::factory()->create();
        $this->actingAs($first)->patch(route('profile.update'), [
            'name' => $first->name,
            'email' => $first->email,
            'username' => 'current-name',
        ])->assertSessionHasNoErrors();
        $this->actingAs($second)->patch(route('profile.update'), [
            'name' => $second->name,
            'email' => $second->email,
            'username' => 'released-name',
        ])->assertSessionHasNoErrors();
        $this->get('/members/released-name')->assertInertia(fn (Assert $page) => $page->where('member.id', $second->id));
        $this->get('/members/'.$first->id)->assertRedirect(route('members.show', 'current-name'));
    }

    public function test_partial_user_selects_do_not_change_existing_usernames(): void
    {
        $user = User::factory()->create(['username' => 'keep-this-name']);
        User::query()->select(['id', 'name'])->findOrFail($user->id);
        $this->assertSame('keep-this-name', $user->fresh()->username);
    }
}
