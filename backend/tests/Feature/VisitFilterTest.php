<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VisitFilterTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  INDEX — date filters                                                */
    /* ------------------------------------------------------------------ */

    public function test_list_filters_by_start_date(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(5)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(2)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()]);

        $start = now()->subDays(3)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/visits?start_date={$start}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_filters_by_end_date(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(5)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(2)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()]);

        $end = now()->subDays(1)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/visits?end_date={$end}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_filters_by_date_range(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(10)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(5)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()->subDays(3)]);
        Visit::factory()->create(['product_id' => $product->id, 'visited_at' => now()]);

        $start = now()->subDays(6)->format('Y-m-d');
        $end   = now()->subDays(2)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/visits?start_date={$start}&end_date={$end}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — device_type filter                                          */
    /* ------------------------------------------------------------------ */

    public function test_list_filters_by_device_type_mobile(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(3)->create(['product_id' => $product->id, 'device_type' => 'mobile']);
        Visit::factory()->count(2)->create(['product_id' => $product->id, 'device_type' => 'desktop']);

        $response = $this->actingAsApiUser()->getJson('/api/visits?device_type=mobile');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_list_filters_by_device_type_desktop(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(2)->create(['product_id' => $product->id, 'device_type' => 'desktop']);
        Visit::factory()->count(3)->create(['product_id' => $product->id, 'device_type' => 'tablet']);

        $response = $this->actingAsApiUser()->getJson('/api/visits?device_type=desktop');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_filters_by_device_type_tablet(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(4)->create(['product_id' => $product->id, 'device_type' => 'tablet']);
        Visit::factory()->count(1)->create(['product_id' => $product->id, 'device_type' => 'mobile']);

        $response = $this->actingAsApiUser()->getJson('/api/visits?device_type=tablet');

        $response->assertOk();
        $this->assertCount(4, $response->json('data'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — search filter (IP and product title)                        */
    /* ------------------------------------------------------------------ */

    public function test_list_search_by_ip_address(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->create(['product_id' => $product->id, 'ip_address' => '192.168.1.100']);
        Visit::factory()->create(['product_id' => $product->id, 'ip_address' => '10.0.0.50']);

        $response = $this->actingAsApiUser()->getJson('/api/visits?search=192.168');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('192.168.1.100', $response->json('data.0.ip_address'));
    }

    public function test_list_search_by_product_title(): void
    {
        $product1 = Product::factory()->create(['title' => 'Kırmızı Halı']);
        $product2 = Product::factory()->create(['title' => 'Mavi Perde']);
        Visit::factory()->create(['product_id' => $product1->id]);
        Visit::factory()->create(['product_id' => $product2->id]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?search=Kırmızı');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — all=1 parameter (no pagination)                             */
    /* ------------------------------------------------------------------ */

    public function test_all_param_returns_flat_array_without_pagination(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(15)->create(['product_id' => $product->id]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');

        $response->assertOk();
        $data = $response->json();
        $this->assertIsArray($data);
        $this->assertCount(15, $data);
        // all=1 ise pagination meta olmamalı
        $this->assertArrayNotHasKey('current_page', $data);
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — combined filters                                            */
    /* ------------------------------------------------------------------ */

    public function test_list_combines_date_and_device_filters(): void
    {
        $product = Product::factory()->create();
        // Bugünden mobil
        Visit::factory()->count(2)->create([
            'product_id' => $product->id,
            'visited_at' => now(),
            'device_type' => 'mobile',
        ]);
        // Bugünden desktop
        Visit::factory()->count(3)->create([
            'product_id' => $product->id,
            'visited_at' => now(),
            'device_type' => 'desktop',
        ]);
        // Geçmiş tarihli mobil
        Visit::factory()->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(10),
            'device_type' => 'mobile',
        ]);

        $start = now()->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/visits?start_date={$start}&device_type=mobile");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — per_page max cap (100)                                      */
    /* ------------------------------------------------------------------ */

    public function test_per_page_capped_at_100(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(5)->create(['product_id' => $product->id]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?per_page=500');

        $response->assertOk();
        $this->assertEquals(100, $response->json('per_page'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — includes trashed product info                               */
    /* ------------------------------------------------------------------ */

    public function test_list_includes_trashed_product_in_relationship(): void
    {
        $product = Product::factory()->create(['title' => 'Silinmiş Ürün']);
        Visit::factory()->create(['product_id' => $product->id]);
        $product->delete();

        $response = $this->actingAsApiUser()->getJson('/api/visits');

        $response->assertOk();
        $this->assertEquals('Silinmiş Ürün', $response->json('data.0.product.title'));
    }

    /* ------------------------------------------------------------------ */
    /*  STORE — geolocation (HTTP mock)                                     */
    /* ------------------------------------------------------------------ */

    public function test_visit_stores_location_from_geolocation_api(): void
    {
        Http::fake([
            'api.ipinfo.io/*' => Http::response(['country' => 'TR'], 200),
        ]);

        $product = Product::factory()->create();

        $this->postJson('/api/visits', ['product_id' => $product->id]);

        $visit = Visit::first();
        $this->assertEquals('TR', $visit->location);
    }

    public function test_visit_handles_geolocation_api_failure_gracefully(): void
    {
        Http::fake([
            'api.ipinfo.io/*' => Http::response(null, 500),
        ]);

        $product = Product::factory()->create();

        $response = $this->postJson('/api/visits', ['product_id' => $product->id]);

        $response->assertCreated();
        $visit = Visit::first();
        $this->assertNull($visit->location);
    }

    public function test_visit_handles_geolocation_api_timeout_gracefully(): void
    {
        Http::fake([
            'api.ipinfo.io/*' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timed out');
            },
        ]);

        $product = Product::factory()->create();

        $response = $this->postJson('/api/visits', ['product_id' => $product->id]);

        $response->assertCreated();
        $visit = Visit::first();
        $this->assertNull($visit->location);
    }

    /* ------------------------------------------------------------------ */
    /*  STORE — device detection edge cases                                 */
    /* ------------------------------------------------------------------ */

    public function test_visit_detects_android_tablet(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Tablet',
        ])->postJson('/api/visits', ['product_id' => $product->id]);

        $this->assertEquals('tablet', Visit::first()->device_type);
    }

    public function test_visit_detects_android_mobile(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
        ])->postJson('/api/visits', ['product_id' => $product->id]);

        $this->assertEquals('mobile', Visit::first()->device_type);
    }

    public function test_visit_defaults_to_desktop_for_unknown_agent(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'curl/7.88.1',
        ])->postJson('/api/visits', ['product_id' => $product->id]);

        $this->assertEquals('desktop', Visit::first()->device_type);
    }

    public function test_visit_handles_empty_user_agent(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => '',
        ])->postJson('/api/visits', ['product_id' => $product->id]);

        $response = Visit::first();
        $this->assertNotNull($response);
        $this->assertEquals('desktop', $response->device_type);
    }
}
