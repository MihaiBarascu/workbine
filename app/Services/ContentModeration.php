<?php

namespace App\Services;

use App\Models\ModerationReview;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class ContentModeration
{
    /** @param array<string, mixed> $fields */
    public function text(?User $user, array $fields, string $context, string $errorField): void
    {
        ksort($fields);
        $this->check($user, ['text' => array_filter($fields, fn ($value) => is_string($value) && trim($value) !== '')], $context, $errorField);
    }

    public function image(User $user, string $webp, string $field): void
    {
        $this->check($user, ['image' => base64_encode($webp)], 'image:'.$field, $field);
    }

    /** @param array<string, mixed> $payload */
    private function check(?User $user, array $payload, string $context, string $field): void
    {
        if ($user?->publishing_suspended_at !== null) {
            throw ValidationException::withMessages([$field => __('Publishing is suspended for this account. Contact support to request a review.')]);
        }
        if (! config('moderation.enabled')) {
            return;
        }
        $fingerprint = hash_hmac('sha256', json_encode([
            config('moderation.policy'), $user?->id, $context, $payload,
        ], JSON_THROW_ON_ERROR), (string) config('app.key'));
        $review = $user === null ? null : ModerationReview::query()->select(['id', 'status', 'created_at'])->where('fingerprint', $fingerprint)->first();
        if ($review !== null && $review->created_at->gt(now()->subDays(config('moderation.review_days')))) {
            if ($review->status === 'approved') {
                return;
            }
            $this->held($review, $field);
        }

        $key = config('moderation.api_key');
        if (! is_string($key) || trim($key) === '') {
            $this->unavailable($field);
        }
        $limit = 'moderation:'.($user->id ?? 'guest:'.request()->ip());
        if (RateLimiter::tooManyAttempts($limit, 30) || RateLimiter::tooManyAttempts('moderation:global', 200)) {
            $this->unavailable($field);
        }
        RateLimiter::hit($limit, 60);
        RateLimiter::hit('moderation:global', 60);
        $input = isset($payload['image'])
            ? [['type' => 'image_url', 'image_url' => ['url' => 'data:image/webp;base64,'.$payload['image']]]]
            : [['type' => 'text', 'text' => json_encode($payload['text'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]];
        try {
            $response = Http::withToken($key)->acceptJson()->connectTimeout(3)->timeout(12)
                ->withOptions(['allow_redirects' => false])
                ->post('https://api.openai.com/v1/moderations', [
                    'model' => config('moderation.model'), 'input' => $input,
                ]);
        } catch (ConnectionException) {
            // Never log submitted content, images, credentials or provider bodies.
            Log::warning('Content moderation provider connection unavailable.');
            $this->unavailable($field);
        }
        $results = $response->json('results');
        $categories = is_array($results) && count($results) === 1 ? ($results[0]['categories'] ?? null) : null;
        $policy = config('moderation.review_categories');
        if (! $response->successful() || ! is_array($categories)
            || count(array_filter($policy, fn ($category) => ! isset($categories[$category]) || ! is_bool($categories[$category]))) > 0) {
            Log::warning('Content moderation provider returned an unusable result.', ['status' => $response->status()]);
            $this->unavailable($field);
        }
        $flagged = array_values(array_filter($policy, fn ($category) => $categories[$category]));
        if ($flagged === []) {
            return;
        }
        if ($user === null) {
            throw ValidationException::withMessages([$field => __('Please choose a different public name. If this seems incorrect, contact support.')]);
        }

        $review = DB::transaction(function () use ($user, $fingerprint, $context, $payload, $flagged, $field): ModerationReview {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Expired snapshots are removed on the next flagged submission; no new worker required.
            ModerationReview::query()->where('created_at', '<=', now()->subDays(config('moderation.review_days')))->delete();
            $existing = ModerationReview::query()->select(['id', 'status', 'created_at'])->where('fingerprint', $fingerprint)->first();
            if ($existing !== null) {
                return $existing;
            }
            if (ModerationReview::query()->where('user_id', $user->id)->count() >= config('moderation.reviews_per_user')) {
                throw ValidationException::withMessages([$field => __('The limit for held submissions has been reached. Contact support before submitting more.')]);
            }

            return ModerationReview::query()->create([
                'user_id' => $user->id, 'fingerprint' => $fingerprint, 'context' => $context,
                'payload' => $payload, 'categories' => $flagged,
            ]);
        });
        if ($review->status !== 'approved') {
            $this->held($review, $field);
        }
    }

    private function held(ModerationReview $review, string $field): never
    {
        $message = $review->status === 'rejected'
            ? __('This submission was not approved (reference #:id). Edit it or contact support to request another review.', ['id' => $review->id])
            : __('This submission needs a content review (reference #:id) and has not been published. Your form is unchanged. You can edit it or retry after approval.', ['id' => $review->id]);
        throw ValidationException::withMessages([$field => $message]);
    }

    private function unavailable(string $field): never
    {
        throw ValidationException::withMessages([$field => __('Content checking is temporarily unavailable. Your changes have not been published. Please try again shortly.')]);
    }
}
