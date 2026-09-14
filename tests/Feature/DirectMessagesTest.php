<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Method;
use App\Models\User;
use App\Models\UserBlock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DirectMessagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['community.reports_enabled' => true]);
    }

    public function test_messaging_requires_a_verified_account(): void
    {
        $recipient = User::factory()->create();
        $unverified = User::factory()->unverified()->create();

        $this->actingAs($unverified)->get(route('messages.index'))->assertRedirect(route('verification.notice'));
        $this->actingAs($unverified)->get(route('messages.create', $recipient->username))->assertRedirect(route('verification.notice'));
        $this->actingAs($unverified)->post(route('messages.start', $recipient->username), ['body' => 'Hello'])->assertRedirect(route('verification.notice'));
        $this->assertDatabaseCount('conversations', 0);
        $this->assertDatabaseCount('messages', 0);
    }

    public function test_member_can_start_a_contextual_conversation_from_a_method(): void
    {
        $method = Method::factory()->create();
        $sender = User::factory()->create();

        $response = $this->actingAs($sender)->post(route('messages.start', $method->user->username), [
            'body' => 'I am working on something similar and wanted to ask about this approach.',
            'context_type' => 'method',
            'context_id' => $method->id,
        ]);

        $conversation = Conversation::query()->firstOrFail();
        $response->assertRedirect(route('messages.show', $conversation));
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'user_id' => $sender->id,
            'context_type' => 'method',
            'context_id' => $method->id,
        ]);

        $this->actingAs($method->user)->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('messages/index')
                ->where('unreadMessages', 1)
                ->where('conversations.data.0.unread_count', 1)
                ->where('conversations.data.0.member.id', $sender->id));

        $this->get(route('messages.show', $conversation))
            ->assertInertia(fn (Assert $page) => $page
                ->component('messages/show')
                ->where('messages.0.context.type', 'method')
                ->where('messages.0.context.id', $method->id)
                ->where('messages.0.context.title', $method->title));
        $this->assertNotNull(Message::query()->firstOrFail()->read_at);
    }

    public function test_existing_pair_reuses_one_conversation_and_context_must_belong_to_recipient(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $theirMethod = Method::factory()->for($recipient)->create();
        $someoneElsesMethod = Method::factory()->create();

        $this->actingAs($sender)->post(route('messages.start', $recipient->username), [
            'body' => 'First message.',
            'context_type' => 'method',
            'context_id' => $theirMethod->id,
        ])->assertRedirect();
        $this->post(route('messages.start', $recipient->username), [
            'body' => 'Second message about the same person.',
        ])->assertRedirect();

        $this->assertDatabaseCount('conversations', 1);
        $this->assertDatabaseCount('messages', 2);

        $this->post(route('messages.start', $recipient->username), [
            'body' => 'Forged context.',
            'context_type' => 'method',
            'context_id' => $someoneElsesMethod->id,
        ])->assertNotFound();
        $this->assertDatabaseCount('messages', 2);
    }

    public function test_new_conversation_volume_is_bounded_without_limiting_existing_threads(): void
    {
        $sender = User::factory()->create();
        $this->actingAs($sender);

        foreach (range(1, 10) as $index) {
            $recipient = User::factory()->create();
            $this->post(route('messages.start', $recipient->username), [
                'body' => 'A distinct conversation '.$index.'.',
            ])->assertRedirect();
        }

        $eleventh = User::factory()->create();
        $this->post(route('messages.start', $eleventh->username), [
            'body' => 'This should hit the daily new-thread bound.',
        ])->assertSessionHasErrors('body');
        $this->assertDatabaseCount('conversations', 10);

        $existing = Conversation::query()->firstOrFail();
        $other = $existing->other($sender);
        $this->post(route('messages.start', $other->username), [
            'body' => 'Existing threads remain usable after the bound.',
        ])->assertRedirect(route('messages.show', $existing));
        $this->assertDatabaseCount('conversations', 10);
        $this->assertDatabaseCount('messages', 11);
    }

    public function test_only_participants_can_read_or_reply_to_a_conversation(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();
        $stranger = User::factory()->create();
        [$one, $two] = Conversation::pair($first, $second);
        $conversation = Conversation::query()->create(['user_one_id' => $one, 'user_two_id' => $two]);
        $conversation->messages()->create(['user_id' => $first->id, 'body' => 'Private conversation text.']);

        $this->actingAs($stranger)->get(route('messages.show', $conversation))->assertNotFound();
        $this->post(route('messages.reply', $conversation), ['body' => 'Intrusion attempt.'])->assertNotFound();
        $this->assertDatabaseCount('messages', 1);
    }

    public function test_blocking_pauses_messages_in_both_directions_until_the_blocker_unblocks(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first)->post(route('messages.start', $second->username), ['body' => 'Hello.'])->assertRedirect();
        $conversation = Conversation::query()->firstOrFail();
        $this->post(route('members.block', $second->username))->assertRedirect();
        $this->assertDatabaseHas('user_blocks', ['blocker_id' => $first->id, 'blocked_id' => $second->id]);
        $this->post(route('messages.reply', $conversation), ['body' => 'Blocked sender message.'])->assertSessionHasErrors('body');

        $this->actingAs($second)->post(route('messages.reply', $conversation), ['body' => 'Blocked recipient message.'])->assertSessionHasErrors('body');
        $this->assertDatabaseCount('messages', 1);

        $this->actingAs($first)->delete(route('members.unblock', $second->username))->assertRedirect();
        $this->assertDatabaseCount('user_blocks', 0);
        $this->post(route('messages.reply', $conversation), ['body' => 'Messaging works again.'])->assertRedirect();
        $this->assertDatabaseCount('messages', 2);
    }

    public function test_message_reports_are_private_to_participants_and_cannot_target_own_messages(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        $stranger = User::factory()->create();
        [$one, $two] = Conversation::pair($sender, $recipient);
        $conversation = Conversation::query()->create(['user_one_id' => $one, 'user_two_id' => $two]);
        $message = $conversation->messages()->create(['user_id' => $sender->id, 'body' => 'A message that can be reported by its recipient.']);

        $this->actingAs($stranger)->get(route('reports.create', ['message', $message->id]))->assertNotFound();
        $this->actingAs($sender)->get(route('reports.create', ['message', $message->id]))->assertNotFound();

        $this->actingAs($recipient)->get(route('reports.create', ['message', $message->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/create')
                ->where('target.type', 'message')
                ->where('target.id', $message->id));
        $this->post(route('reports.store', ['message', $message->id]), [
            'reason' => 'harassment',
            'details' => 'Private report details.',
        ])->assertRedirect(route('messages.show', $conversation).'#message-'.$message->id);
        $this->assertDatabaseHas('content_reports', [
            'user_id' => $recipient->id,
            'target_type' => 'message',
            'target_id' => $message->id,
            'reason' => 'harassment',
        ]);
    }

    public function test_hidden_message_remains_in_history_as_a_moderation_placeholder(): void
    {
        $sender = User::factory()->create();
        $recipient = User::factory()->create();
        [$one, $two] = Conversation::pair($sender, $recipient);
        $conversation = Conversation::query()->create(['user_one_id' => $one, 'user_two_id' => $two]);
        $message = $conversation->messages()->create(['user_id' => $sender->id, 'body' => 'Removed private text.']);
        $message->forceFill(['hidden_at' => now()])->save();

        $this->actingAs($recipient)->get(route('messages.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('unreadMessages', 0)
                ->where('conversations.data.0.unread_count', 0));

        $this->get(route('messages.show', $conversation))
            ->assertInertia(fn (Assert $page) => $page
                ->where('messages.0.id', $message->id)
                ->where('messages.0.removed', true)
                ->where('messages.0.body', null));
    }
}
