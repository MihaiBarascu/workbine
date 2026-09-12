<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TopicDiscovery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CommunityNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_pages_share_the_public_catalog_and_default_navigation_preference(): void
    {
        $this->get('/login')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('communityCategories', TopicDiscovery::categories())
            ->where('sidebarOpen', true)
            ->where('auth.user', null));
    }

    public function test_account_pages_respect_the_existing_sidebar_cookie_without_changing_account_data(): void
    {
        $user = User::factory()->create();
        $original = $user->getAttributes();

        $this->actingAs($user)->withUnencryptedCookie('sidebar_state', 'false')
            ->get('/settings/profile')->assertOk()->assertInertia(fn (Assert $page) => $page
                ->where('sidebarOpen', false)
                ->where('communityCategories', TopicDiscovery::categories()));

        $this->assertSame($original, $user->refresh()->getAttributes());
    }
}
