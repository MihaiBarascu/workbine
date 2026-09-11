<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'topic_id']);
            $table->index(['user_id', 'created_at', 'id']);
            $table->index('topic_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_topics');
    }
};
