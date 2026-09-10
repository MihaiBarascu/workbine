<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('method_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('outcome', 32);
            $table->text('body');
            $table->string('evidence_url', 2048)->nullable();
            $table->date('tried_on')->nullable();
            $table->timestamps();
            $table->unique(['method_id', 'user_id']);
            $table->index(['method_id', 'updated_at', 'id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('experiences');
    }
};
