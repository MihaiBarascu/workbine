<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table): void {
            $table->string('category', 40)->nullable()->index();
        });
        Schema::create('topic_tags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('topic_id')->index()->constrained()->cascadeOnDelete();
            $table->string('name', 24)->index();
            $table->unique(['topic_id', 'name']);
        });
        Schema::create('topic_likes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('topic_id')->index()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'topic_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topic_likes');
        Schema::dropIfExists('topic_tags');
        Schema::table('topics', function (Blueprint $table): void {
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });
    }
};
