<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function activity_log_index_requires_authentication(): void
    {
        $response = $this->getJson('/api/activity-logs');

        $response->assertUnauthorized();
    }

    /** @test */
    public function activity_log_index_returns_paginated_logs(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create([
            'user_id' => null,
            'action' => 'login',
            'description' => 'Test kaydı 1',
        ]);

        ActivityLog::create([
            'user_id' => null,
            'action' => 'product_created',
            'description' => 'Test kaydı 2',
        ]);

        $response = $this->getJson('/api/activity-logs?per_page=1&page=2');

        $response->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('current_page', 2);
    }

    /** @test */
    public function creating_a_product_creates_activity_log(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Log Test Ürünü',
            'description' => 'Log test açıklaması',
            'qr_token'    => 'log-token-123',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
        ])->assertCreated();

        $product = Product::first();

        $this->assertDatabaseHas('activity_logs', [
            'action'      => 'product_created',
            'subject_type'=> Product::class,
            'subject_id'  => $product->id,
        ]);
    }

    /** @test */
    public function updating_a_product_creates_activity_log(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create([
            'title'       => 'Eski Başlık',
            'description' => 'Eski açıklama',
        ]);

        $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => 'Yeni Başlık',
            'description' => 'Yeni açıklama',
            'is_active'   => true,
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'      => 'product_updated',
            'subject_type'=> Product::class,
            'subject_id'  => $product->id,
        ]);
    }

    /** @test */
    public function soft_deleting_a_product_creates_activity_log(): void
    {
        $product = Product::factory()->create(['title' => 'Silinecek Log Ürünü']);

        $this->actingAsApiUser()->deleteJson("/api/products/{$product->id}")
            ->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'      => 'product_deleted',
            'subject_type'=> Product::class,
            'subject_id'  => $product->id,
        ]);
    }

    /** @test */
    public function restoring_a_product_creates_activity_log(): void
    {
        $product = Product::factory()->create(['title' => 'Geri Getir Log Ürünü']);
        $product->delete();

        $this->actingAsApiUser()->postJson("/api/products/{$product->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'      => 'product_restored',
            'subject_type'=> Product::class,
            'subject_id'  => $product->id,
        ]);
    }

    /** @test */
    public function updating_site_settings_creates_activity_log(): void
    {
        SiteSetting::create(['qr_enabled' => true]);

        $this->actingAsApiUser()->putJson('/api/site-settings', [
            'qr_enabled' => false,
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'      => 'site_settings_updated',
            'subject_type'=> SiteSetting::class,
        ]);
    }
}

