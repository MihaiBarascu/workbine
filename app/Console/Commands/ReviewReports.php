<?php

namespace App\Console\Commands;

use App\Models\ContentReport;
use App\Support\ReportTargets;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Output\OutputInterface;

class ReviewReports extends Command
{
    protected $signature = 'reports:review {id? : Report to inspect} {--action= : hide or dismiss} {--note= : Reason for the decision}';

    protected $description = 'List private pending reports, inspect one, or record a moderation decision';

    public function handle(): int
    {
        if ($this->argument('id') === null) {
            if ($this->option('action') !== null) {
                $this->error('Choose a report ID before taking action.');

                return self::FAILURE;
            }

            $reports = ContentReport::query()->where('status', 'open')->orderBy('id')->limit(50)->get();
            $this->table(['ID', 'Type', 'Content ID', 'Reason'], $reports->map(fn (ContentReport $report): array => [
                $report->id, $report->target_type, $report->target_id, $report->reason,
            ])->all());
            $this->info('Showing up to 50 oldest open reports. Inspect with reports:review ID.');

            return self::SUCCESS;
        }

        $id = (string) $this->argument('id');
        if (preg_match('/^[1-9][0-9]{0,17}$/D', $id) !== 1) {
            $this->error('Use a positive report ID of at most 18 digits.');

            return self::FAILURE;
        }

        $report = ContentReport::query()->find((int) $id);
        if ($report === null) {
            $this->error('Report not found.');

            return self::FAILURE;
        }

        $target = ReportTargets::find($report->target_type, $report->target_id, true);
        $action = $this->option('action');
        if ($action === null) {
            // JSON escapes control characters supplied by contributors; do not interpret console markup.
            $this->output->writeln(json_encode([
                'report' => $report->only(['id', 'target_type', 'target_id', 'reason', 'details', 'status', 'review_note']),
                'content' => $target?->only(['id', 'title', 'description', 'body', 'source_url', 'evidence_url', 'evidence_image_id', 'hidden_at']),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), OutputInterface::OUTPUT_RAW);

            return self::SUCCESS;
        }

        $note = trim((string) $this->option('note'));
        if (! in_array($action, ['hide', 'dismiss'], true) || mb_strlen($note) < 3 || mb_strlen($note) > 2000) {
            $this->error('Use --action=hide or --action=dismiss and a --note of 3 to 2000 characters.');

            return self::FAILURE;
        }
        if ($action === 'hide' && $target === null) {
            $this->error('Content no longer exists. Dismiss the report with an explanation.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($report, $target, $action, $note): void {
            if ($action === 'hide') {
                // Leave content timestamps and edit-conflict tokens unchanged.
                $target->newQueryWithoutScopes()->whereKey($target->getKey())->toBase()->update(['hidden_at' => now()]);
            }
            $report->forceFill(['status' => $action === 'hide' ? 'hidden' : 'dismissed', 'review_note' => $note, 'reviewed_at' => now()])->save();
        });
        $this->info('Decision saved. Hidden content and its history are retained.');

        return self::SUCCESS;
    }
}
