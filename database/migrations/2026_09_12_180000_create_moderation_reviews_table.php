<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moderation_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('fingerprint', 64)->unique();
            $table->string('context', 100);
            $table->text('payload')->nullable();
            $table->json('categories');
            $table->string('status')->default('pending')->index();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('created_at');
        });
        Schema::table('content_reports', function (Blueprint $table): void {
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
        });
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('publishing_suspended_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_reviews');
        Schema::table('content_reports', fn (Blueprint $table) => $table->dropConstrainedForeignId('reviewed_by'));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('publishing_suspended_at'));
    }
};
