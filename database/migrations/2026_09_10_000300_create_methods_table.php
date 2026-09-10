<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 160);
            $table->text('body');
            $table->string('source_url', 2048)->nullable();
            $table->timestamps();

            $table->index(['topic_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('methods');
    }
};
