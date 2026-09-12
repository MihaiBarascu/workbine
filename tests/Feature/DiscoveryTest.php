<?php

namespace Tests\Feature;

use App\Models\MediaImage;
use App\Models\Method;
use App\Models\SavedTopic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_save_flags_are_private_to_the_signed_in_member(): void
    {
        $method = Method::factory()->create();
        $member = User::factory()->create();
        SavedTopic::query()->create(['user_id' => $member->id, 'topic_id' => $method->topic_id]);
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.saved', false));
        $response = $this->actingAs($member)->get('/topics');
        $response->assertInertia(fn (Assert $page) => $page->where('topics.data.0.saved', true));
        $this->assertTrue($response->headers->hasCacheControlDirective('no-store'));
        $this->actingAs(User::factory()->create())->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.saved', false));
    }

    public function test_feed_photos_come_only_from_published_visible_methods(): void
    {
        $method = Method::factory()->create();
        $image = MediaImage::query()->create(['user_id' => $method->user_id, 'disk' => 'public', 'path' => 'test-photo.webp', 'bytes' => 100, 'width' => 600, 'height' => 400, 'rich_text' => true, 'rich_method_id' => $method->id]);
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.cover_image.url', $image->url())->missing('topics.data.0.cover_image.user_id'));
        $method->forceFill(['hidden_at' => now()])->save();
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.cover_image', null));
        $method->forceFill(['hidden_at' => null])->save();
        $image->update(['pending_deletion' => true]);
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.cover_image', null));
        $image->update(['pending_deletion' => false, 'rich_method_id' => null]);
        $this->get('/topics')->assertInertia(fn (Assert $page) => $page->where('topics.data.0.cover_image', null));
    }

    public function test_community_guide_is_public(): void
    {
        $this->get('/community/guide')->assertOk()->assertInertia(fn (Assert $page) => $page->component('community/guide'));
    }
}
