<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class TopicWithMethodTest extends TestCase
{
    use RefreshDatabase;

    public function test_topic_and_first_method_are_published_together_under_the_current_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $unrelated = Topic::factory()->create();

        $response = $this->actingAs($user)->post(route('topics.store'), [
            ...$this->submission(),
            'user_id' => $other->id,
            'topic_id' => $unrelated->id,
        ]);

        $topic = Topic::query()->where('slug', 'automating-product-imports')->firstOrFail();
        $method = $topic->methods()->sole();
        $response->assertSessionHasNoErrors()->assertRedirect(route('topics.show', $topic));
        $this->assertSame($user->id, $topic->user_id);
        $this->assertSame($user->id, $method->user_id);
        $this->assertSame('Validate supplier files before importing', $method->title);
        $this->assertSame($this->submission()['method_body'], $method->body);
        $this->assertSame('https://example.com/import-guide', $method->source_url);
        $this->assertSame(0, $unrelated->methods()->count());

        $this->get(route('topics.show', $topic))->assertInertia(fn (Assert $page) => $page
            ->where('topic.methods_count', 1)
            ->has('methods', 1)
            ->where('methods.0.id', $method->id));
        $this->get(route('topics.index', ['view' => 'unanswered']))->assertInertia(fn (Assert $page) => $page
            ->has('topics.data', 1)
            ->where('topics.data.0.id', $unrelated->id));
    }

    public function test_json_boolean_opt_in_and_omitted_source_are_supported(): void
    {
        $data = $this->submission();
        $data['include_method'] = true;
        unset($data['method_source_url']);

        $this->actingAs(User::factory()->create())->postJson(route('topics.store'), $data)
            ->assertRedirect();

        $this->assertDatabaseCount('topics', 1);
        $this->assertNull(Method::query()->sole()->source_url);
    }

    public function test_topic_only_creation_ignores_disabled_method_fields(): void
    {
        $this->actingAs(User::factory()->create())->post(route('topics.store'), [
            ...$this->submission(),
            'include_method' => '0',
            'method_title' => [],
            'method_body' => '',
            'method_source_url' => 'javascript:alert(1)',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseCount('topics', 1);
        $this->assertDatabaseCount('methods', 0);
    }

    public function test_omitting_opt_in_still_publishes_only_the_topic(): void
    {
        $data = $this->submission();
        unset($data['include_method']);
        $this->actingAs(User::factory()->create())->post(route('topics.store'), $data)
            ->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseCount('topics', 1);
        $this->assertDatabaseCount('methods', 0);
    }

    /** @param array<string, mixed> $invalid */
    #[DataProvider('invalidSubmissions')]
    public function test_invalid_combined_submission_saves_neither_record(array $invalid, string $field): void
    {
        $this->actingAs(User::factory()->create())
            ->from(route('topics.create'))
            ->post(route('topics.store'), [...$this->submission(), ...$invalid])
            ->assertRedirect(route('topics.create'))
            ->assertSessionHasErrors($field);

        $this->assertDatabaseCount('topics', 0);
        $this->assertDatabaseCount('methods', 0);
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function invalidSubmissions(): array
    {
        return [
            'topic title required' => [['title' => ''], 'title'],
            'method title required' => [['method_title' => ''], 'method_title'],
            'method title bounded' => [['method_title' => str_repeat('a', 161)], 'method_title'],
            'method body required' => [['method_body' => ''], 'method_body'],
            'method body bounded' => [['method_body' => str_repeat('a', 10001)], 'method_body'],
            'method body must be text' => [['method_body' => ['steps']], 'method_body'],
            'source must be web URL' => [['method_source_url' => 'ftp://example.com/file'], 'method_source_url'],
            'source rejects scripts' => [['method_source_url' => 'javascript:alert(1)'], 'method_source_url'],
            'source bounded' => [['method_source_url' => 'https://example.com/'.str_repeat('a', 2048)], 'method_source_url'],
            'opt in must be boolean' => [['include_method' => 'yes'], 'include_method'],
        ];
    }

    public function test_method_storage_failure_rolls_back_the_topic(): void
    {
        $this->actingAs(User::factory()->create())->withoutExceptionHandling();
        // Keep model listeners isolated so the simulated failure cannot affect later tests.
        $originalDispatcher = Method::getEventDispatcher();
        Method::setEventDispatcher(clone $originalDispatcher);
        Method::creating(function (): void {
            throw new RuntimeException('Simulated method storage failure');
        });

        try {
            $this->post(route('topics.store'), $this->submission());
            $this->fail('Expected method storage to fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated method storage failure', $exception->getMessage());
            $this->assertDatabaseCount('topics', 0);
            $this->assertDatabaseCount('methods', 0);
        } finally {
            Method::setEventDispatcher($originalDispatcher);
        }
    }

    public function test_guests_cannot_publish_a_topic_with_a_method(): void
    {
        $this->post(route('topics.store'), $this->submission())->assertRedirect(route('login'));
        $this->assertDatabaseCount('topics', 0);
        $this->assertDatabaseCount('methods', 0);
    }

    /** @return array<string, string> */
    private function submission(): array
    {
        return [
            'title' => 'Automating product imports',
            'description' => 'Sharing ways to handle inconsistent supplier files.',
            'include_method' => '1',
            'method_title' => 'Validate supplier files before importing',
            'method_body' => 'I checked columns, tested a small batch, then imported the rest. It saved time, but unusual files still needed manual fixes.',
            'method_source_url' => 'https://example.com/import-guide',
        ];
    }
}
