<?php

namespace App\Http\Controllers;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\ModerationReview;
use App\Models\User;
use App\Support\ReportTargets;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ModerationController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        Inertia::encryptHistory();
        ModerationReview::query()->where('created_at', '<=', now()->subDays(config('moderation.review_days')))->delete();
        if ($request->query('kind') === 'suspended') {
            return Inertia::render('moderation/index', [
                'kind' => 'suspended', 'history' => false,
                'items' => User::query()->whereNotNull('publishing_suspended_at')
                    ->select(['id', 'username', 'publishing_suspended_at'])->orderBy('id')
                    ->paginate(20)->withQueryString()->through(fn (User $user): array => [
                        'id' => $user->id, 'status' => 'suspended', 'summary' => '@'.$user->username,
                        'created_at' => $user->publishing_suspended_at?->toIso8601String(),
                    ]),
            ]);
        }
        $kind = $request->query('kind') === 'report' ? 'report' : 'review';
        $history = $request->boolean('history');
        $query = $kind === 'review'
            ? ModerationReview::query()->select(['id', 'status', 'context', 'created_at'])
            : ContentReport::query()->select(['id', 'status', 'target_type', 'reason', 'created_at']);
        if ($kind === 'review') {
            $query->where('created_at', '>', now()->subDays(config('moderation.review_days')));
        }
        if (! $history) {
            $query->where('status', $kind === 'review' ? 'pending' : 'open');
        }

        return Inertia::render('moderation/index', [
            'kind' => $kind, 'history' => $history,
            'items' => $query->orderBy('id')->paginate(20)->withQueryString()->through(fn ($item): array => [
                'id' => $item->id, 'status' => $item->status,
                'summary' => $item instanceof ModerationReview ? $this->contextLabel($item->context) : $item->target_type.' · '.$item->reason,
                'created_at' => $item->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function show(string $kind, int $id): InertiaResponse
    {
        Inertia::encryptHistory();
        if ($kind === 'review') {
            $item = $this->review($id);
            $payload = $item->payload ?? [];
            $text = $payload['text'] ?? [];
            $author = User::query()->find($item->user_id);
            $image = isset($payload['image']) ? route('moderation.image', $id, false) : null;
            $reasons = $item->categories === []
                ? [__('Automatic checking unavailable — manual review required. No violation has been determined.')]
                : $item->categories;
            $hidden = false;
        } else {
            $item = ContentReport::query()->findOrFail($id);
            $target = ReportTargets::find($item->target_type, $item->target_id, true);
            $text = $target?->only(['title', 'description', 'body', 'source_url', 'evidence_url']) ?? [];
            $author = $target === null ? null : User::query()->find($target->user_id);
            $image = $target instanceof Experience ? $target->evidenceImage?->url() : null;
            $reasons = [$item->reason];
            $hidden = $target?->hidden_at !== null;
        }

        return Inertia::render('moderation/show', [
            'kind' => $kind, 'item' => [
                'id' => $item->id, 'status' => $item->status, 'text' => $text,
                'image' => $image, 'reasons' => $reasons, 'hidden' => $hidden,
                'details' => $item instanceof ContentReport ? $item->details : null,
                'note' => $item->review_note,
                'author' => $author === null ? null : [
                    'username' => $author->username,
                    'suspended' => $author->publishing_suspended_at !== null,
                ],
            ],
        ]);
    }

    public function image(int $id): Response
    {
        $image = $this->review($id)->payload['image'] ?? null;
        abort_unless(is_string($image), 404);
        $bytes = base64_decode($image, true);
        abort_unless(is_string($bytes), 404);

        return response($bytes, 200, [
            'Content-Type' => 'image/webp', 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'",
        ]);
    }

    public function decide(Request $request, string $kind, int $id): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in($kind === 'review' ? ['approve', 'reject'] : ['hide', 'dismiss', 'restore'])],
            'note' => ['required', 'string', 'min:3', 'max:2000'],
            'publishing' => ['required', Rule::in(['unchanged', 'suspend', 'restore'])],
        ]);
        DB::transaction(function () use ($kind, $id, $data, $request): void {
            $item = $kind === 'review'
                ? $this->review($id, true)
                : ContentReport::query()->lockForUpdate()->findOrFail($id);
            $authorId = null;
            if ($item instanceof ModerationReview) {
                $status = $data['action'] === 'approve' ? 'approved' : 'rejected';
                $authorId = $item->user_id;
            } else {
                $target = ReportTargets::find($item->target_type, $item->target_id, true);
                abort_if($target === null && $data['action'] !== 'dismiss', 422, 'Content no longer exists. Dismiss this report.');
                $authorId = $target?->user_id;
                if (in_array($data['action'], ['hide', 'restore'], true)) {
                    $target->newQueryWithoutScopes()->whereKey($target->getKey())->toBase()->update([
                        'hidden_at' => $data['action'] === 'hide' ? now() : null,
                    ]);
                }
                $status = match ($data['action']) {
                    'hide' => 'hidden', 'restore' => 'restored', default => 'dismissed',
                };
            }
            if ($data['publishing'] !== 'unchanged' && $authorId !== null) {
                // Prevent accidental self-suspension; it is never an automated classifier decision.
                abort_if($authorId === $request->user()->id, 422, 'You cannot change your own publishing access here.');
                User::query()->whereKey($authorId)->update([
                    'publishing_suspended_at' => $data['publishing'] === 'suspend' ? now() : null,
                ]);
            }
            $item->forceFill([
                'status' => $status, 'review_note' => $data['note'], 'reviewed_at' => now(), 'reviewed_by' => $request->user()->id,
            ])->save();
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Moderation decision saved.')]);

        return to_route('moderation.show', [$kind, $id]);
    }

    public function restorePublishing(int $id): RedirectResponse
    {
        User::query()->findOrFail($id)->forceFill(['publishing_suspended_at' => null])->save();
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Publishing access restored.')]);

        return to_route('moderation.index', ['kind' => 'suspended']);
    }

    private function contextLabel(string $context): string
    {
        return match (true) {
            $context === 'topic:new' => 'New topic',
            str_starts_with($context, 'topic:') => 'Topic edit',
            str_starts_with($context, 'method:new:') => 'New method',
            str_starts_with($context, 'method:') => 'Method edit',
            str_starts_with($context, 'experience:') => 'Experience',
            $context === 'image:avatar' => 'Profile photo',
            $context === 'image:evidence_image' => 'Evidence image',
            default => 'Public profile',
        };
    }

    private function review(int $id, bool $lock = false): ModerationReview
    {
        return ModerationReview::query()->where('created_at', '>', now()->subDays(config('moderation.review_days')))
            ->when($lock, fn ($query) => $query->lockForUpdate())->findOrFail($id);
    }
}
