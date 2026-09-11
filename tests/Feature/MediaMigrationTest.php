<?php

namespace Tests\Feature;

use App\Models\Method;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MediaMigrationTest extends TestCase
{
    // SQLite table rebuilds must run outside a test transaction, as real migrations do.
    use DatabaseMigrations;

    public function test_migration_can_roll_back_and_restore_without_changing_existing_accounts_or_experiences(): void
    {
        $user = User::factory()->create();
        $method = Method::factory()->create();
        $experience = $method->experiences()->create([
            'user_id' => $user->id, 'outcome' => 'worked', 'body' => 'Existing public experience before images are available.',
        ]);
        $migration = require database_path('migrations/2026_09_11_150000_create_media_images_table.php');
        $migration->down();
        $this->assertFalse(Schema::hasTable('media_images'));
        $this->assertFalse(Schema::hasColumn('users', 'avatar_image_id'));
        $this->assertDatabaseHas('users', ['id' => $user->id, 'username' => $user->username]);
        $this->assertDatabaseHas('experiences', ['id' => $experience->id, 'body' => $experience->body]);
        $migration->up();
        $this->assertNull($user->refresh()->avatar_image_id);
        $this->assertNull($experience->refresh()->evidence_image_id);
    }
}
