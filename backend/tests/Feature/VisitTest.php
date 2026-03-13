<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  STORE (record visit)                                               */
    /* ------------------------------------------------------------------ */

    public function test_can_record_visit_for_existing_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $response->assertCreated()
            ->assertJsonFragment(['message' => 'Visit recorded']);

        $this->assertDatabaseCount('visits', 1);
        $this->assertDatabaseHas('visits', [
            'product_id' => $product->id,
        ]);
    }

    public function test_visit_captures_ip_address(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertNotNull($visit->ip_address);
    }

    public function test_visit_captures_user_agent(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        ])->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertStringContainsString('Chrome', $visit->user_agent);
    }

    public function test_visit_detects_desktop_device(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        ])->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertEquals('desktop', $visit->device_type);
    }

    public function test_visit_detects_mobile_device(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        ])->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertEquals('mobile', $visit->device_type);
    }

    public function test_visit_detects_tablet_device(): void
    {
        $product = Product::factory()->create();

        $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        ])->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertEquals('tablet', $visit->device_type);
    }

    public function test_visit_sets_visited_at_timestamp(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/visits', [
            'product_id' => $product->id,
        ]);

        $visit = Visit::first();
        $this->assertNotNull($visit->visited_at);
    }

    public function test_store_requires_product_id(): void
    {
        $response = $this->postJson('/api/visits', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');
    }

    public function test_store_rejects_nonexistent_product_id(): void
    {
        $response = $this->postJson('/api/visits', [
            'product_id' => 9999,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('product_id');
    }

    public function test_can_record_multiple_visits_for_same_product(): void
    {
        $product = Product::factory()->create();

        $this->postJson('/api/visits', ['product_id' => $product->id]);
        $this->postJson('/api/visits', ['product_id' => $product->id]);
        $this->postJson('/api/visits', ['product_id' => $product->id]);

        $this->assertDatabaseCount('visits', 3);
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX (list visits)                                                */
    /* ------------------------------------------------------------------ */

    public function test_can_list_visits(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(5)->create(['product_id' => $product->id]);

        $response = $this->getJson('/api/visits');

        $response->assertOk()
            ->assertJsonCount(5);
    }

    public function test_list_returns_empty_array_when_no_visits(): void
    {
        $response = $this->getJson('/api/visits');

        $response->assertOk()
            ->assertJsonCount(0);
    }

    public function test_list_includes_product_relationship(): void
    {
        $product = Product::factory()->create(['title' => 'İlişkili Ürün']);
        Visit::factory()->create(['product_id' => $product->id]);

        $response = $this->getJson('/api/visits');

        $response->assertOk()
            ->assertJsonFragment(['title' => 'İlişkili Ürün']);
    }

    public function test_list_is_ordered_by_visited_at_descending(): void
    {
        $product = Product::factory()->create();

        Visit::factory()->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDays(2),
        ]);
        Visit::factory()->create([
            'product_id' => $product->id,
            'visited_at' => now(),
        ]);
        Visit::factory()->create([
            'product_id' => $product->id,
            'visited_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/visits');
        $dates = collect($response->json())->pluck('visited_at');

        $this->assertTrue(
            $dates->first() > $dates->last(),
            'Visits should be ordered by visited_at descending'
        );
    }

    public function test_list_limits_to_500_visits(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(510)->create(['product_id' => $product->id]);

        $response = $this->getJson('/api/visits');

        $response->assertOk()
            ->assertJsonCount(500);
    }
}
