<?php

namespace Tests\Feature;

use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CommunityNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_pages_share_only_categories_with_visible_topics_and_default_navigation_preference(): void
    {
        Topic::factory()->create(['category' => 'ai']);
        $hidden = Topic::factory()->create(['category' => 'ecommerce']);
        $hidden->forceFill(['hidden_at' => now()])->save();

        $this->get('/login')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('communityCategories', ['ai' => 'AI in Practice'])
            ->where('sidebarOpen', true)
            ->where('auth.user', null));
    }

    public function test_account_pages_respect_the_existing_sidebar_cookie_without_changing_account_data(): void
    {
        $user = User::factory()->create();
        $original = $user->refresh()->getAttributes();

        $this->actingAs($user)->withUnencryptedCookie('sidebar_state', 'false')
            ->get('/settings/profile')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('sidebarOpen', false)
            ->where('communityCategories', []));

        $this->assertSame($original, $user->refresh()->getAttributes());
    }
}
