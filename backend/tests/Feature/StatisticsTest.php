<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatisticsTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  Toplam QR (ürün sayısı)                                            */
    /* ------------------------------------------------------------------ */

    public function test_products_endpoint_returns_total_product_count(): void
    {
        Product::factory()->count(7)->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');

        $response->assertOk();
        $this->assertCount(7, $response->json());
    }

    public function test_products_include_active_and_inactive_in_count(): void
    {
        Product::factory()->count(3)->create(['is_active' => true]);
        Product::factory()->count(2)->create(['is_active' => false]);

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');

        $response->assertOk();
        $this->assertCount(5, $response->json());
    }

    /* ------------------------------------------------------------------ */
    /*  Toplam tarama (ziyaret sayısı)                                     */
    /* ------------------------------------------------------------------ */

    public function test_visits_endpoint_returns_total_visit_count(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(12)->create(['product_id' => $product->id]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');

        $response->assertOk();
        $this->assertCount(12, $response->json());
    }

    /* ------------------------------------------------------------------ */
    /*  Bugünkü tarama                                                     */
    /* ------------------------------------------------------------------ */

    public function test_visits_contain_visited_at_for_today_filtering(): void
    {
        $product = Product::factory()->create();

        // Bugünkü ziyaretler
        Visit::factory()->count(3)->create([
            'product_id' => $product->id,
            'visited_at' => now(),
        ]);

        // Dünkü ziyaretler
        Visit::factory()->count(2)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDay(),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $todayCount = $visits->filter(function ($v) {
            return str_starts_with($v['visited_at'], now()->toDateString());
        })->count();

        $this->assertEquals(3, $todayCount);
    }

    public function test_visits_contain_visited_at_for_yesterday_filtering(): void
    {
        $product = Product::factory()->create();

        Visit::factory()->count(4)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDay(),
        ]);

        Visit::factory()->count(1)->create([
            'product_id' => $product->id,
            'visited_at' => now(),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $yesterdayCount = $visits->filter(function ($v) {
            return str_starts_with($v['visited_at'], now()->subDay()->toDateString());
        })->count();

        $this->assertEquals(4, $yesterdayCount);
    }

    /* ------------------------------------------------------------------ */
    /*  Haftalık tarama (son 7 gün)                                        */
    /* ------------------------------------------------------------------ */

    public function test_visits_support_weekly_filtering(): void
    {
        $product = Product::factory()->create();

        // Son 7 gün
        Visit::factory()->count(5)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(3),
        ]);

        // 7+ gün önce
        Visit::factory()->count(3)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(10),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $last7 = $visits->filter(function ($v) {
            return $v['visited_at'] >= now()->subDays(7)->toDateTimeString();
        })->count();

        $this->assertEquals(5, $last7);
    }

    public function test_visits_support_previous_week_comparison(): void
    {
        $product = Product::factory()->create();

        // Son 7 gün: 6 ziyaret
        Visit::factory()->count(6)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(2),
        ]);

        // Önceki 7 gün (8-14 gün önce): 4 ziyaret
        Visit::factory()->count(4)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(10),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $startLast7 = now()->subDays(7);
        $startPrev7 = now()->subDays(14);

        $last7 = $visits->filter(fn ($v) => $v['visited_at'] >= $startLast7->toDateTimeString())->count();
        $prev7 = $visits->filter(fn ($v) =>
            $v['visited_at'] >= $startPrev7->toDateTimeString() &&
            $v['visited_at'] < $startLast7->toDateTimeString()
        )->count();

        $this->assertEquals(6, $last7);
        $this->assertEquals(4, $prev7);
    }

    /* ------------------------------------------------------------------ */
    /*  Aylık tarama (son 30 gün)                                          */
    /* ------------------------------------------------------------------ */

    public function test_visits_support_monthly_filtering(): void
    {
        $product = Product::factory()->create();

        // Son 30 gün
        Visit::factory()->count(8)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(15),
        ]);

        // 30+ gün önce
        Visit::factory()->count(3)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(45),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $last30 = $visits->filter(fn ($v) =>
            $v['visited_at'] >= now()->subDays(30)->toDateTimeString()
        )->count();

        $this->assertEquals(8, $last30);
    }

    public function test_visits_support_previous_month_comparison(): void
    {
        $product = Product::factory()->create();

        // Son 30 gün: 10 ziyaret
        Visit::factory()->count(10)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(5),
        ]);

        // Önceki 30 gün (31-60 gün önce): 7 ziyaret
        Visit::factory()->count(7)->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(45),
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($response->json());

        $startLast30 = now()->subDays(30);
        $startPrev30 = now()->subDays(60);

        $last30 = $visits->filter(fn ($v) => $v['visited_at'] >= $startLast30->toDateTimeString())->count();
        $prev30 = $visits->filter(fn ($v) =>
            $v['visited_at'] >= $startPrev30->toDateTimeString() &&
            $v['visited_at'] < $startLast30->toDateTimeString()
        )->count();

        $this->assertEquals(10, $last30);
        $this->assertEquals(7, $prev30);
    }

    /* ------------------------------------------------------------------ */
    /*  Ürün bazlı ziyaret sayısı (visits_count)                           */
    /* ------------------------------------------------------------------ */

    public function test_each_product_has_its_own_visits_count(): void
    {
        $product1 = Product::factory()->create();
        $product2 = Product::factory()->create();
        $product3 = Product::factory()->create();

        Visit::factory()->count(10)->create(['product_id' => $product1->id]);
        Visit::factory()->count(3)->create(['product_id' => $product2->id]);
        // product3 has 0 visits

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');
        $products = collect($response->json());

        $this->assertEquals(10, $products->firstWhere('id', $product1->id)['visits_count']);
        $this->assertEquals(3, $products->firstWhere('id', $product2->id)['visits_count']);
        $this->assertEquals(0, $products->firstWhere('id', $product3->id)['visits_count']);
    }

    public function test_visits_count_reflects_zero_for_new_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');

        $this->assertEquals(0, $response->json('0.visits_count'));
    }

    /* ------------------------------------------------------------------ */
    /*  Ziyaret verisinde gerekli alanlar                                  */
    /* ------------------------------------------------------------------ */

    public function test_visit_response_contains_required_fields_for_stats(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->create([
            'product_id'  => $product->id,
            'device_type' => 'mobile',
        ]);

        $response = $this->actingAsApiUser()->getJson('/api/visits?all=1');

        $response->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'product_id',
                    'ip_address',
                    'device_type',
                    'user_agent',
                    'visited_at',
                    'product' => ['id', 'title'],
                ],
            ]);
    }

    public function test_product_response_contains_created_at_for_trend(): void
    {
        Product::factory()->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');

        $response->assertOk()
            ->assertJsonStructure([
                '*' => [
                    'id',
                    'title',
                    'is_active',
                    'visits_count',
                    'created_at',
                ],
            ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Çoklu ürün + karışık tarih senaryosu                               */
    /* ------------------------------------------------------------------ */

    public function test_mixed_scenario_multiple_products_various_dates(): void
    {
        $p1 = Product::factory()->create();
        $p2 = Product::factory()->create();

        // p1: 2 bugün, 3 dün, 1 geçen hafta
        Visit::factory()->count(2)->create(['product_id' => $p1->id, 'visited_at' => now()]);
        Visit::factory()->count(3)->create(['product_id' => $p1->id, 'visited_at' => now()->subDay()]);
        Visit::factory()->count(1)->create(['product_id' => $p1->id, 'visited_at' => now()->subDays(10)]);

        // p2: 1 bugün, 5 geçen ay
        Visit::factory()->count(1)->create(['product_id' => $p2->id, 'visited_at' => now()]);
        Visit::factory()->count(5)->create(['product_id' => $p2->id, 'visited_at' => now()->subDays(40)]);

        // Ürün bazlı visits_count
        $productsRes = $this->actingAsApiUser()->getJson('/api/products?all=1');
        $products = collect($productsRes->json());
        $this->assertEquals(6, $products->firstWhere('id', $p1->id)['visits_count']);
        $this->assertEquals(6, $products->firstWhere('id', $p2->id)['visits_count']);

        // Toplam ziyaret
        $visitsRes = $this->actingAsApiUser()->getJson('/api/visits?all=1');
        $visits = collect($visitsRes->json());
        $this->assertCount(12, $visits);

        // Bugünkü
        $todayCount = $visits->filter(fn ($v) =>
            str_starts_with($v['visited_at'], now()->toDateString())
        )->count();
        $this->assertEquals(3, $todayCount); // p1:2 + p2:1

        // Son 7 gün
        $last7 = $visits->filter(fn ($v) =>
            $v['visited_at'] >= now()->subDays(7)->toDateTimeString()
        )->count();
        $this->assertEquals(6, $last7); // p1:2+3, p2:1
    }
}
