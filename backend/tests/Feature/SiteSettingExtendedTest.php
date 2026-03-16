<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingExtendedTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  UPDATE — activity log details                                       */
    /* ------------------------------------------------------------------ */

    public function test_update_activity_log_contains_before_after_values(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $this->actingAsApiUser()->putJson('/api/site-settings', [
            'qr_enabled' => false,
        ])->assertOk();

        $log = ActivityLog::where('action', 'site_settings_updated')->first();

        $this->assertNotNull($log);
        $this->assertTrue($log->metadata['qr_enabled_before']);
        $this->assertFalse($log->metadata['qr_enabled_after']);
    }

    /* ------------------------------------------------------------------ */
    /*  SHOW — response structure                                           */
    /* ------------------------------------------------------------------ */

    public function test_show_returns_correct_structure(): void
    {
        SiteSetting::create(['qr_enabled' => false]);

        $response = $this->getJson('/api/site-settings');

        $response->assertOk()
            ->assertJsonStructure(['id', 'qr_enabled', 'created_at', 'updated_at'])
            ->assertJsonPath('qr_enabled', false);
    }

    /* ------------------------------------------------------------------ */
    /*  UPDATE — response structure                                         */
    /* ------------------------------------------------------------------ */

    public function test_update_returns_message_and_data(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $response = $this->actingAsApiUser()->putJson('/api/site-settings', [
            'qr_enabled' => false,
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'qr_enabled'],
            ])
            ->assertJsonPath('data.qr_enabled', false);
    }

    /* ------------------------------------------------------------------ */
    /*  UPDATE — idempotent toggle                                          */
    /* ------------------------------------------------------------------ */

    public function test_update_same_value_is_idempotent(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $this->actingAsApiUser()->putJson('/api/site-settings', [
            'qr_enabled' => true,
        ])->assertOk();

        $this->assertDatabaseHas('site_settings', ['qr_enabled' => true]);
    }

    /* ------------------------------------------------------------------ */
    /*  Singleton behaviour                                                 */
    /* ------------------------------------------------------------------ */

    public function test_multiple_show_calls_do_not_create_duplicates(): void
    {
        $this->getJson('/api/site-settings')->assertOk();
        $this->getJson('/api/site-settings')->assertOk();

        $this->assertDatabaseCount('site_settings', 1);
    }
}
