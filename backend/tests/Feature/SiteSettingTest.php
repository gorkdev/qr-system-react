<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  SHOW (get settings)                                                */
    /* ------------------------------------------------------------------ */

    public function test_can_get_site_settings(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $response = $this->getJson('/api/site-settings');

        $response->assertOk()
            ->assertJsonFragment(['qr_enabled' => true]);
    }

    public function test_creates_default_settings_when_none_exist(): void
    {
        $this->assertDatabaseCount('site_settings', 0);

        $response = $this->getJson('/api/site-settings');

        $response->assertOk()
            ->assertJsonFragment(['qr_enabled' => true]);

        $this->assertDatabaseCount('site_settings', 1);
    }

    /* ------------------------------------------------------------------ */
    /*  UPDATE (put settings)                                              */
    /* ------------------------------------------------------------------ */

    public function test_can_disable_qr(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $response = $this->putJson('/api/site-settings', [
            'qr_enabled' => false,
        ]);

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Site settings updated.']);

        $this->assertDatabaseHas('site_settings', ['qr_enabled' => false]);
    }

    public function test_can_enable_qr(): void
    {
        SiteSetting::create(['qr_enabled' => false]);

        $response = $this->putJson('/api/site-settings', [
            'qr_enabled' => true,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('site_settings', ['qr_enabled' => true]);
    }

    public function test_update_creates_setting_if_none_exists(): void
    {
        $this->assertDatabaseCount('site_settings', 0);

        $response = $this->putJson('/api/site-settings', [
            'qr_enabled' => false,
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('site_settings', 1);
        $this->assertDatabaseHas('site_settings', ['qr_enabled' => false]);
    }

    public function test_update_requires_qr_enabled(): void
    {
        $response = $this->putJson('/api/site-settings', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('qr_enabled');
    }

    public function test_update_rejects_non_boolean_qr_enabled(): void
    {
        $response = $this->putJson('/api/site-settings', [
            'qr_enabled' => 'yes',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('qr_enabled');
    }
}
