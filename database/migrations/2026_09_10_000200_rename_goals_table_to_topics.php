<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('goals', 'topics');
    }

    public function down(): void
    {
        Schema::rename('topics', 'goals');
    }
};
