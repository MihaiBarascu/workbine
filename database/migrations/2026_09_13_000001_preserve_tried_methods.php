<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('methods', function (Blueprint $table): void {
            $table->timestamp('protected_at')->nullable();
        });
        // Include hidden experiences: removing visibility must not reopen editing.
        DB::statement('UPDATE methods SET protected_at = COALESCE((SELECT MIN(experiences.created_at) FROM experiences WHERE experiences.method_id = methods.id AND experiences.user_id <> methods.user_id), CURRENT_TIMESTAMP) WHERE EXISTS (SELECT 1 FROM experiences WHERE experiences.method_id = methods.id AND experiences.user_id <> methods.user_id)');
        Schema::create('method_updates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('method_id')->constrained()->cascadeOnDelete();
            $table->uuid('submission_id');
            $table->text('body');
            $table->timestamps();
            $table->unique(['method_id', 'submission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('method_updates');
        Schema::table('methods', fn (Blueprint $table) => $table->dropColumn('protected_at'));
    }
};
