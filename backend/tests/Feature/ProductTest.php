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
    /*  LIST (index)                                                       */
    /* ------------------------------------------------------------------ */

    public function test_can_list_all_products(): void
    {
        Product::factory()->count(3)->create();

        $response = $this->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(3);
    }

    public function test_list_returns_empty_array_when_no_products(): void
    {
        $response = $this->getJson('/api/products');

        $response->assertOk()
            ->assertJsonCount(0);
    }

    public function test_list_includes_visits_count(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(5)->create(['product_id' => $product->id]);

        $response = $this->getJson('/api/products');

        $response->assertOk();
        $this->assertEquals(5, $response->json('0.visits_count'));
    }

    /* ------------------------------------------------------------------ */
    /*  SHOW (single)                                                      */
    /* ------------------------------------------------------------------ */

    public function test_can_show_single_product(): void
    {
        $product = Product::factory()->create(['title' => 'Test Ürün']);

        $response = $this->getJson("/api/products/{$product->id}");

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Test Ürün']);
    }

    public function test_show_returns_404_for_nonexistent_product(): void
    {
        $response = $this->getJson('/api/products/999');

        $response->assertNotFound();
    }

    /* ------------------------------------------------------------------ */
    /*  STORE (create)                                                     */
    /* ------------------------------------------------------------------ */

    public function test_can_create_product_with_required_fields(): void
    {
        Storage::fake('public');

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $response = $this->postJson('/api/products', [
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

        $this->postJson('/api/products', [
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
    /*  UPDATE                                                             */
    /* ------------------------------------------------------------------ */

    public function test_can_update_product_text_fields(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create([
            'title'       => 'Eski Başlık',
            'description' => 'Eski açıklama',
        ]);

        $response = $this->putJson("/api/products/{$product->id}", [
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

        $response = $this->putJson("/api/products/{$product->id}", [
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
        $response = $this->putJson('/api/products/999', [
            'title'       => 'Deneme',
            'description' => 'Açıklama',
            'is_active'   => true,
        ]);

        $response->assertNotFound();
    }

    public function test_update_validates_required_fields(): void
    {
        $product = Product::factory()->create();

        $response = $this->putJson("/api/products/{$product->id}", []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'is_active']);
    }

    public function test_can_update_youtube_url(): void
    {
        $product = Product::factory()->create(['youtube_url' => null]);

        $response = $this->putJson("/api/products/{$product->id}", [
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

        $response = $this->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => false,
        ]);

        $response->assertOk();
        $this->assertFalse($product->fresh()->is_active);
    }

    /* ------------------------------------------------------------------ */
    /*  SHOW BY TOKEN (public)                                             */
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

    public function test_show_by_token_returns_404_for_inactive_product(): void
    {
        Product::factory()->create([
            'qr_token'  => 'inactive-token',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/products/token/inactive-token');

        $response->assertNotFound();
    }

    public function test_show_by_token_returns_404_for_invalid_token(): void
    {
        $response = $this->getJson('/api/products/token/nonexistent-token');

        $response->assertNotFound();
    }
}
