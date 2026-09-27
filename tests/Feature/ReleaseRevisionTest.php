<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReleaseRevisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_reports_the_release_revision(): void
    {
        config(['app.revision' => 'fadabb55f694738115aae867c607b56c729b52d1']);

        $this->get('/up')
            ->assertOk()
            ->assertHeader('X-Workbine-Revision', 'fadabb55f694738115aae867c607b56c729b52d1');
    }

    public function test_revision_is_only_reported_on_the_health_check(): void
    {
        config(['app.revision' => 'fadabb55f694738115aae867c607b56c729b52d1']);

        $this->get('/')->assertOk()->assertHeaderMissing('X-Workbine-Revision');
        $this->get('/topics')->assertOk()->assertHeaderMissing('X-Workbine-Revision');
    }

    public function test_builds_without_a_revision_do_not_send_the_header(): void
    {
        foreach ([null, ''] as $revision) {
            config(['app.revision' => $revision]);

            $this->get('/up')->assertOk()->assertHeaderMissing('X-Workbine-Revision');
        }
    }
}
