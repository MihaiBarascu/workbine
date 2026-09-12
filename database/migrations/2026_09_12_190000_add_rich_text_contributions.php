<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['methods', 'experiences'] as $table) {
            Schema::table($table, fn (Blueprint $table) => $table->json('body_document')->nullable());
        }
        Schema::table('media_images', function (Blueprint $table): void {
            $table->boolean('rich_text')->default(false);
            $table->foreignId('rich_method_id')->nullable()->constrained('methods')->nullOnDelete();
            $table->foreignId('rich_experience_id')->nullable()->constrained('experiences')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('media_images', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('rich_method_id');
            $table->dropConstrainedForeignId('rich_experience_id');
            $table->dropColumn('rich_text');
        });
        foreach (['methods', 'experiences'] as $table) {
            Schema::table($table, fn (Blueprint $table) => $table->dropColumn('body_document'));
        }
    }
};
