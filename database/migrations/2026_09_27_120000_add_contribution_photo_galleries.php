<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // New columns rather than reusing rich_*: during a deploy the previous release still
        // treats rich_* as photos inside documents and would detach gallery photos on save.
        Schema::table('media_images', function (Blueprint $table): void {
            $table->foreignId('gallery_method_id')->nullable()->constrained('methods')->nullOnDelete();
            $table->foreignId('gallery_experience_id')->nullable()->constrained('experiences')->nullOnDelete();
            $table->unsignedSmallInteger('position')->nullable();
            $table->string('caption', 140)->nullable();
            $table->index(['gallery_method_id', 'position']);
            $table->index(['gallery_experience_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('media_images', function (Blueprint $table): void {
            $table->dropIndex(['gallery_method_id', 'position']);
            $table->dropIndex(['gallery_experience_id', 'position']);
            $table->dropConstrainedForeignId('gallery_method_id');
            $table->dropConstrainedForeignId('gallery_experience_id');
            $table->dropColumn(['position', 'caption']);
        });
    }
};
