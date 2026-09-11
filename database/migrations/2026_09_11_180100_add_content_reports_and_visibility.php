<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['topics', 'methods', 'experiences'] as $table) {
            Schema::table($table, function (Blueprint $table): void {
                $table->timestamp('hidden_at')->nullable();
            });
        }

        Schema::create('content_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('target_type', 20);
            $table->unsignedBigInteger('target_id');
            $table->string('reason', 30);
            $table->text('details')->nullable();
            $table->string('status', 20)->default('open');
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'target_type', 'target_id']);
            $table->index(['status', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_reports');

        foreach (['topics', 'methods', 'experiences'] as $table) {
            Schema::table($table, fn (Blueprint $table) => $table->dropColumn('hidden_at'));
        }
    }
};
