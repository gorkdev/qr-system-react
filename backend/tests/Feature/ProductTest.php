<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  LIST (index) — requires auth                                        */
    /* ------------------------------------------------------------------ */

    public function test_list_requires_authentication(): void
    {
        $response = $this->getJson('/api/products');
        $response->assertUnauthorized();
    }

    public function test_can_list_all_products(): void
    {
        Product::factory()->count(3)->create();

        $response = $this->actingAsApiUser()->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_list_returns_empty_array_when_no_products(): void
    {
        $response = $this->actingAsApiUser()->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_list_includes_visits_count(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(5)->create(['product_id' => $product->id]);

        $response = $this->actingAsApiUser()->getJson('/api/products');

        $response->assertOk();
        $this->assertEquals(5, $response->json('data.0.visits_count'));
    }

    public function test_list_respects_pagination(): void
    {
        Product::factory()->count(15)->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?per_page=5&page=2');

        $response->assertOk();
        $this->assertCount(5, $response->json('data'));
        $this->assertEquals(15, $response->json('total'));
        $this->assertEquals(2, $response->json('current_page'));
    }

    public function test_list_all_param_returns_collection_without_pagination(): void
    {
        Product::factory()->count(25)->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?all=1');

        $response->assertOk();
        $data = $response->json();
        $this->assertIsArray($data);
        $this->assertCount(25, $data);
        $this->assertArrayNotHasKey('current_page', $data);
    }

    public function test_list_filters_by_search_title(): void
    {
        Product::factory()->create(['title' => 'Özel Ürün Adı']);
        Product::factory()->create(['title' => 'Başka Bir Şey']);
        Product::factory()->create(['title' => 'Özel Koleksiyon']);

        $response = $this->actingAsApiUser()->getJson('/api/products?search=Özel');

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertCount(2, $titles);
        $this->assertContains('Özel Ürün Adı', $titles);
        $this->assertContains('Özel Koleksiyon', $titles);
    }

    public function test_list_filters_by_search_description(): void
    {
        Product::factory()->create(['title' => 'A', 'description' => 'İçinde nadir kelime var']);
        Product::factory()->create(['title' => 'B', 'description' => 'Sıradan açıklama']);

        $response = $this->actingAsApiUser()->getJson('/api/products?search=nadir');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('A', $response->json('data.0.title'));
    }

    public function test_list_filters_by_status_active(): void
    {
        Product::factory()->count(2)->create(['is_active' => true]);
        Product::factory()->count(3)->create(['is_active' => false]);

        $response = $this->actingAsApiUser()->getJson('/api/products?status=active');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_filters_by_status_inactive(): void
    {
        Product::factory()->count(2)->create(['is_active' => true]);
        Product::factory()->count(3)->create(['is_active' => false]);

        $response = $this->actingAsApiUser()->getJson('/api/products?status=inactive');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_list_filters_by_start_date(): void
    {
        Product::factory()->create(['created_at' => now()->subDays(5)]);
        Product::factory()->create(['created_at' => now()->subDays(2)]);
        Product::factory()->create(['created_at' => now()]);

        $start = now()->subDays(3)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/products?start_date={$start}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_filters_by_end_date(): void
    {
        Product::factory()->create(['created_at' => now()->subDays(5)]);
        Product::factory()->create(['created_at' => now()->subDays(2)]);
        Product::factory()->create(['created_at' => now()]);

        $end = now()->subDays(1)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/products?end_date={$end}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /* ------------------------------------------------------------------ */
    /*  SHOW (single) — requires auth                                       */
    /* ------------------------------------------------------------------ */

    public function test_show_requires_authentication(): void
    {
        $product = Product::factory()->create();
        $response = $this->getJson("/api/products/{$product->id}");
        $response->assertUnauthorized();
    }

    public function test_can_show_single_product(): void
    {
        $product = Product::factory()->create(['title' => 'Test Ürün']);

        $response = $this->actingAsApiUser()->getJson("/api/products/{$product->id}");

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Test Ürün']);
    }

    public function test_show_returns_404_for_nonexistent_product(): void
    {
        $response = $this->actingAsApiUser()->getJson('/api/products/999');

        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------ */
    /*  STORE (create) — requires auth                                      */
    /* ------------------------------------------------------------------ */

    public function test_store_requires_authentication(): void
    {
        Storage::fake('public');
        $response = $this->postJson('/api/products', [
            'title'       => 'Yeni',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
        ]);
        $response->assertUnauthorized();
    }

    public function test_can_create_product_with_required_fields(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Yeni Ürün',
            'description' => 'Ürün açıklaması detaylı',
            'qr_token'    => 'test-token-123',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
        ]);

        $response->assertCreated()
            ->assertJsonFragment(['title' => 'Yeni Ürün'])
            ->assertJsonPath('data.qr_token', 'test-token-123')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('products', [
            'title'    => 'Yeni Ürün',
            'qr_token' => 'test-token-123',
        ]);
    }

    public function test_can_create_product_with_all_optional_fields(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Tam Ürün',
            'description' => 'Eksiksiz ürün açıklaması',
            'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'qr_token'    => 'full-token-456',
            'is_active'   => false,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
            'alt_images'  => [
                UploadedFile::fake()->image('alt1.jpg', 400, 300),
                UploadedFile::fake()->image('alt2.jpg', 400, 300),
            ],
            'pdf'         => UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf'),
            'qr'          => UploadedFile::fake()->image('qr.png', 600, 600),
        ]);

        $response->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product->youtube_url);
        $this->assertNotNull($product->pdf_path);
        $this->assertNotNull($product->qr_image_path);
        $this->assertCount(2, $product->alt_image_paths);
        $this->assertFalse($product->is_active);
    }

    public function test_store_requires_title(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_store_requires_description(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'    => 'Ürün',
            'qr_token' => 'token',
            'is_active' => true,
            'cover'    => UploadedFile::fake()->image('cover.jpg'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('description');
    }

    public function test_store_requires_cover_image(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('cover');
    }

    public function test_store_requires_qr_token(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('qr_token');
    }

    public function test_store_requires_is_active(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('is_active');
    }

    public function test_store_rejects_non_image_cover(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->create('cover.txt', 100, 'text/plain'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('cover');
    }

    public function test_store_rejects_oversized_cover(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg')->size(6000), // 6MB > 5MB limit
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('cover');
    }

    public function test_store_rejects_non_pdf_document(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Ürün',
            'description' => 'Açıklama',
            'qr_token'    => 'token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
            'pdf'         => UploadedFile::fake()->create('doc.docx', 500, 'application/msword'),
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('pdf');
    }

    public function test_store_saves_files_to_storage(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Storage Test',
            'description' => 'Dosya kayıt testi',
            'qr_token'    => 'storage-token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
        ]);

        $product = Product::first();
        Storage::disk('public')->assertExists($product->cover_image_path);
    }

    /* ------------------------------------------------------------------ */
    /*  UPDATE — requires auth                                              */
    /* ------------------------------------------------------------------ */

    public function test_update_requires_authentication(): void
    {
        $product = Product::factory()->create();
        $response = $this->putJson("/api/products/{$product->id}", [
            'title'       => 'X',
            'description' => 'Y',
            'is_active'   => true,
        ]);
        $response->assertUnauthorized();
    }

    public function test_can_update_product_text_fields(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create([
            'title'       => 'Eski Başlık',
            'description' => 'Eski açıklama',
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => 'Yeni Başlık',
            'description' => 'Yeni açıklama detaylı',
            'is_active'   => true,
        ]);

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Yeni Başlık']);

        $this->assertDatabaseHas('products', [
            'id'    => $product->id,
            'title' => 'Yeni Başlık',
        ]);
    }

    public function test_can_update_product_with_new_cover(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create([
            'cover_image_path' => 'products/old/cover.jpg',
        ]);

        Storage::disk('public')->put('products/old/cover.jpg', 'old-content');

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('new-cover.jpg', 800, 600),
        ]);

        $response->assertOk();

        $updated = $product->fresh();
        Storage::disk('public')->assertExists($updated->cover_image_path);
    }

    public function test_update_returns_404_for_nonexistent_product(): void
    {
        $response = $this->actingAsApiUser()->putJson('/api/products/999', [
            'title'       => 'Deneme',
            'description' => 'Açıklama',
            'is_active'   => true,
        ]);

        $response->assertNotFound();
    }

    public function test_update_validates_required_fields(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'is_active']);
    }

    public function test_can_update_youtube_url(): void
    {
        $product = Product::factory()->create(['youtube_url' => null]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'youtube_url' => 'https://youtu.be/abc123',
        ]);

        $response->assertOk();
        $this->assertEquals('https://youtu.be/abc123', $product->fresh()->youtube_url);
    }

    public function test_can_toggle_is_active(): void
    {
        $product = Product::factory()->create(['is_active' => true]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => false,
        ]);

        $response->assertOk();
        $this->assertFalse($product->fresh()->is_active);
    }

    public function test_update_rejects_when_product_is_trashed(): void
    {
        $product = Product::factory()->create();
        $product->delete();

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => 'Yeni',
            'description' => 'Açıklama',
            'is_active'   => true,
        ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Ürün çöp kutusunda. Önce geri getirmelisiniz.']);
    }

    /* ------------------------------------------------------------------ */
    /*  DESTROY (soft delete) — requires auth                               */
    /* ------------------------------------------------------------------ */

    public function test_destroy_requires_authentication(): void
    {
        $product = Product::factory()->create();
        $response = $this->deleteJson("/api/products/{$product->id}");
        $response->assertUnauthorized();
    }

    public function test_can_destroy_product_soft_delete(): void
    {
        $product = Product::factory()->create(['title' => 'Silinecek']);

        $response = $this->actingAsApiUser()->deleteJson("/api/products/{$product->id}");

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Ürün çöp kutusuna taşındı. 30 gün içinde geri getirebilirsiniz.']);

        $this->assertSoftDeleted('products', ['id' => $product->id]);
    }

    public function test_destroy_returns_404_for_nonexistent_product(): void
    {
        $response = $this->actingAsApiUser()->deleteJson('/api/products/999');
        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------ */
    /*  RESTORE — requires auth                                              */
    /* ------------------------------------------------------------------ */

    public function test_restore_requires_authentication(): void
    {
        $product = Product::factory()->create();
        $product->delete();
        $response = $this->postJson("/api/products/{$product->id}/restore");
        $response->assertUnauthorized();
    }

    public function test_can_restore_trashed_product(): void
    {
        $product = Product::factory()->create(['title' => 'Geri Getirilecek']);
        $product->delete();

        $response = $this->actingAsApiUser()->postJson("/api/products/{$product->id}/restore");

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Ürün geri getirildi.'])
            ->assertJsonPath('data.title', 'Geri Getirilecek');

        $this->assertDatabaseHas('products', ['id' => $product->id, 'deleted_at' => null]);
    }

    public function test_restore_returns_404_for_nontrashed_product(): void
    {
        $product = Product::factory()->create();

        $response = $this->actingAsApiUser()->postJson("/api/products/{$product->id}/restore");

        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------ */
    /*  TRASHED (list) — requires auth                                      */
    /* ------------------------------------------------------------------ */

    public function test_trashed_requires_authentication(): void
    {
        $response = $this->getJson('/api/products/trashed');
        $response->assertUnauthorized();
    }

    public function test_can_list_trashed_products(): void
    {
        $product = Product::factory()->create(['title' => 'Çöptekiler']);
        $product->delete();

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, count($data));
        $titles = collect($data)->pluck('title')->all();
        $this->assertContains('Çöptekiler', $titles);
    }

    public function test_trashed_excludes_non_deleted_products(): void
    {
        Product::factory()->create(['title' => 'Aktif Ürün']);
        $deleted = Product::factory()->create(['title' => 'Silinmiş']);
        $deleted->delete();

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed');

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertNotContains('Aktif Ürün', $titles);
        $this->assertContains('Silinmiş', $titles);
    }

    /* ------------------------------------------------------------------ */
    /*  PURGE — requires auth                                                */
    /* ------------------------------------------------------------------ */

    public function test_purge_requires_authentication(): void
    {
        $response = $this->postJson('/api/products/purge-trashed');
        $response->assertUnauthorized();
    }

    public function test_purge_returns_message_when_nothing_to_purge(): void
    {
        $response = $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $response->assertOk()
            ->assertJsonPath('purged_count', 0)
            ->assertJsonFragment(['message' => 'Silinecek ürün yok.']);
    }

    public function test_purge_permanently_deletes_old_trashed_products(): void
    {
        $product = Product::factory()->create();
        $product->delete();
        Product::withTrashed()->where('id', $product->id)->update(['deleted_at' => now()->subDays(31)]);

        $response = $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $response->assertOk()
            ->assertJsonPath('purged_count', 1);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    /* ------------------------------------------------------------------ */
    /*  SHOW BY TOKEN (public, no auth)                                     */
    /* ------------------------------------------------------------------ */

    public function test_can_show_product_by_qr_token(): void
    {
        $product = Product::factory()->create([
            'qr_token'  => 'public-token-789',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/products/token/public-token-789');

        $response->assertOk()
            ->assertJsonFragment(['qr_token' => 'public-token-789']);
    }

    public function test_show_by_token_returns_inactive_message_for_inactive_product(): void
    {
        Product::factory()->create([
            'qr_token'  => 'inactive-token',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/products/token/inactive-token');

        $response->assertOk()
            ->assertJsonPath('inactive', true)
            ->assertJsonFragment(['message' => 'Bu ürün şu anda kullanıma kapalıdır.']);
    }

    public function test_show_by_token_returns_404_for_invalid_token(): void
    {
        $response = $this->getJson('/api/products/token/nonexistent-token');

        $response->assertNotFound();
    }
}
