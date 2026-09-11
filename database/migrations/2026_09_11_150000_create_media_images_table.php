<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_images', function (Blueprint $table) {
            $table->id();
            // Keep the object ledger after account/cascading content deletion.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('disk', 64);
            $table->string('path')->unique();
            $table->unsignedInteger('bytes');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->boolean('pending_deletion')->default(false);
            $table->timestamps();
            $table->index(['pending_deletion', 'created_at']);
            $table->index('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('avatar_image_id')->nullable()->constrained('media_images')->nullOnDelete();
            $table->index('avatar_image_id');
        });

        Schema::table('experiences', function (Blueprint $table) {
            $table->foreignId('evidence_image_id')->nullable()->constrained('media_images')->nullOnDelete();
            $table->index('evidence_image_id');
        });
    }

    public function down(): void
    {
        Schema::table('experiences', function (Blueprint $table) {
            $table->dropIndex(['evidence_image_id']);
            $table->dropConstrainedForeignId('evidence_image_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['avatar_image_id']);
            $table->dropConstrainedForeignId('avatar_image_id');
        });
        Schema::dropIfExists('media_images');
    }
};
