<?php

namespace App\Http\Controllers;

use App\Models\ContentReport;
use App\Models\Experience;
use App\Models\Message;
use App\Support\ReportTargets;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContentReportController extends Controller
{
    public function create(Request $request, string $type, int $id): Response
    {
        abort_unless(config('community.reports_enabled'), 404);
        $target = ReportTargets::find($type, $id);
        abort_if($target === null, 404);
        $this->authorizePrivateTarget($request, $target);

        return Inertia::render('reports/create', [
            'target' => [
                'type' => $type,
                'id' => $id,
                'title' => match (true) {
                    $target instanceof Experience => 'Experience on '.$target->method->title,
                    $target instanceof Message => 'Private message from @'.$target->user->username,
                    default => $target->title,
                },
                'url' => ReportTargets::url($target),
            ],
        ]);
    }

    public function store(Request $request, string $type, int $id): RedirectResponse
    {
        abort_unless(config('community.reports_enabled'), 404);
        $target = ReportTargets::find($type, $id);
        abort_if($target === null, 404);
        $this->authorizePrivateTarget($request, $target);
        $data = $request->validate([
            'reason' => ['required', Rule::in(['spam', 'harassment', 'unsafe', 'privacy', 'other'])],
            'details' => ['nullable', 'string', 'max:2000', 'required_if:reason,other'],
        ]);

        // One report per member/content; retries cannot flood the review queue.
        ContentReport::query()->firstOrCreate([
            'user_id' => $request->user()->getAuthIdentifier(),
            'target_type' => $type,
            'target_id' => $id,
        ], $data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Report received. Thank you for flagging it.')]);

        return redirect(ReportTargets::url($target));
    }

    private function authorizePrivateTarget(Request $request, mixed $target): void
    {
        if (! $target instanceof Message) {
            return;
        }

        abort_unless($target->conversation->involves($request->user()), 404);
        abort_if($target->user_id === $request->user()->id, 404);
    }
}
