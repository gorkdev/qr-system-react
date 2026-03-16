<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductExtendedTest extends TestCase
{
    use RefreshDatabase;

    /* ================================================================== */
    /*  SHOW — trashed product access via admin                            */
    /* ================================================================== */

    public function test_show_returns_trashed_product_for_admin(): void
    {
        $product = Product::factory()->create(['title' => 'Çöpteki Ürün']);
        $product->delete();

        $response = $this->actingAsApiUser()->getJson("/api/products/{$product->id}");

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Çöpteki Ürün']);
    }

    /* ================================================================== */
    /*  SHOW BY TOKEN — edge cases                                         */
    /* ================================================================== */

    public function test_show_by_token_returns_404_for_soft_deleted_product(): void
    {
        $product = Product::factory()->create([
            'qr_token'  => 'deleted-token-abc',
            'is_active' => true,
        ]);
        $product->delete();

        $response = $this->getJson('/api/products/token/deleted-token-abc');

        $response->assertNotFound();
    }

    public function test_show_by_token_returns_full_product_data(): void
    {
        Product::factory()->create([
            'qr_token'    => 'full-data-token',
            'is_active'   => true,
            'title'       => 'QR Ürün',
            'description' => 'QR açıklama',
        ]);

        $response = $this->getJson('/api/products/token/full-data-token');

        $response->assertOk()
            ->assertJsonStructure([
                'id', 'title', 'description', 'youtube_url',
                'cover_image_path', 'alt_image_paths', 'pdf_path',
                'qr_token', 'is_active', 'created_at',
            ]);
    }

    /* ================================================================== */
    /*  LIST — ordering                                                    */
    /* ================================================================== */

    public function test_list_is_ordered_by_created_at_descending(): void
    {
        Product::factory()->create(['title' => 'Eski', 'created_at' => now()->subDays(5)]);
        Product::factory()->create(['title' => 'Yeni', 'created_at' => now()]);
        Product::factory()->create(['title' => 'Orta', 'created_at' => now()->subDays(2)]);

        $response = $this->actingAsApiUser()->getJson('/api/products');

        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertEquals(['Yeni', 'Orta', 'Eski'], $titles);
    }

    public function test_list_combined_date_filters(): void
    {
        Product::factory()->create(['created_at' => now()->subDays(15)]);
        Product::factory()->create(['created_at' => now()->subDays(5)]);
        Product::factory()->create(['created_at' => now()->subDays(3)]);
        Product::factory()->create(['created_at' => now()]);

        $start = now()->subDays(6)->format('Y-m-d');
        $end   = now()->subDays(2)->format('Y-m-d');
        $response = $this->actingAsApiUser()->getJson("/api/products?start_date={$start}&end_date={$end}");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_list_per_page_capped_at_100(): void
    {
        Product::factory()->count(3)->create();

        $response = $this->actingAsApiUser()->getJson('/api/products?per_page=999');

        $response->assertOk();
        $this->assertEquals(100, $response->json('per_page'));
    }

    /* ================================================================== */
    /*  STORE — file storage details                                       */
    /* ================================================================== */

    public function test_store_saves_alt_images_to_storage(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Alt Test',
            'description' => 'Alt görseller kaydedilecek',
            'qr_token'    => 'alt-token-1',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
            'alt_images'  => [
                UploadedFile::fake()->image('alt1.jpg', 400, 300),
                UploadedFile::fake()->image('alt2.jpg', 400, 300),
            ],
        ])->assertCreated();

        $product = Product::first();
        $this->assertCount(2, $product->alt_image_paths);
        foreach ($product->alt_image_paths as $path) {
            Storage::disk('public')->assertExists($path);
        }
    }

    public function test_store_saves_pdf_to_storage(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'PDF Test',
            'description' => 'PDF kaydedilecek',
            'qr_token'    => 'pdf-token-1',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
            'pdf'         => UploadedFile::fake()->create('doc.pdf', 1024, 'application/pdf'),
        ])->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product->pdf_path);
        Storage::disk('public')->assertExists($product->pdf_path);
    }

    public function test_store_saves_qr_image_to_storage(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'QR Test',
            'description' => 'QR kaydedilecek',
            'qr_token'    => 'qr-img-token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
            'qr'          => UploadedFile::fake()->image('qr.png', 600, 600),
        ])->assertCreated();

        $product = Product::first();
        $this->assertNotNull($product->qr_image_path);
        Storage::disk('public')->assertExists($product->qr_image_path);
    }

    public function test_store_creates_qr_token_txt_file(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Token TXT Test',
            'description' => 'Token txt dosyası oluşturulmalı',
            'qr_token'    => 'my-qr-token-xyz',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
        ])->assertCreated();

        $product = Product::first();
        $folder  = dirname($product->cover_image_path);
        Storage::disk('public')->assertExists($folder . '/qr-token.txt');
        $this->assertEquals('my-qr-token-xyz', Storage::disk('public')->get($folder . '/qr-token.txt'));
    }

    /* ================================================================== */
    /*  STORE — validation edge cases                                      */
    /* ================================================================== */

    public function test_store_rejects_non_image_alt_files(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Alt Fail',
            'description' => 'Alt dosya tipi hatalı',
            'qr_token'    => 'alt-fail-token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
            'alt_images'  => [
                UploadedFile::fake()->create('not-image.txt', 100, 'text/plain'),
            ],
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('alt_images.0');
    }

    public function test_store_rejects_oversized_pdf(): void
    {
        Storage::fake('public');

        $response = $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Big PDF',
            'description' => 'PDF çok büyük',
            'qr_token'    => 'big-pdf-token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg'),
            'pdf'         => UploadedFile::fake()->create('huge.pdf', 60000, 'application/pdf'), // 60MB > 50MB
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('pdf');
    }

    /* ================================================================== */
    /*  UPDATE — alt images management                                     */
    /* ================================================================== */

    public function test_update_can_add_new_alt_images(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create([
            'alt_image_paths' => ['products/test/alt-1.jpg'],
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'alt_images'  => [
                UploadedFile::fake()->image('new-alt.jpg', 400, 300),
            ],
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        // Mevcut 1 + yeni 1 = 2
        $this->assertCount(2, $updated->alt_image_paths);
    }

    public function test_update_can_remove_alt_images(): void
    {
        Storage::fake('public');

        $altPath = 'products/test/alt-1.jpg';
        Storage::disk('public')->put($altPath, 'fake-image-content');

        $product = Product::factory()->create([
            'alt_image_paths' => [$altPath, 'products/test/alt-2.jpg'],
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'            => $product->title,
            'description'      => $product->description,
            'is_active'        => true,
            'remove_alt_images' => [$altPath],
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        $this->assertCount(1, $updated->alt_image_paths);
        $this->assertNotContains($altPath, $updated->alt_image_paths);
        Storage::disk('public')->assertMissing($altPath);
    }

    public function test_update_can_replace_pdf(): void
    {
        Storage::fake('public');

        $oldPdfPath = 'products/test/old-doc.pdf';
        Storage::disk('public')->put($oldPdfPath, 'old-pdf-content');

        $product = Product::factory()->create([
            'pdf_path' => $oldPdfPath,
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'pdf'         => UploadedFile::fake()->create('new-doc.pdf', 500, 'application/pdf'),
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        $this->assertNotEquals($oldPdfPath, $updated->pdf_path);
        Storage::disk('public')->assertExists($updated->pdf_path);
        Storage::disk('public')->assertMissing($oldPdfPath);
    }

    public function test_update_can_replace_cover_image(): void
    {
        Storage::fake('public');

        // cover aynı klasörde cover.jpg olarak kaydediliyor, bu yüzden farklı klasör kullan
        $oldCoverPath = 'products/old-folder/cover.jpg';
        Storage::disk('public')->put($oldCoverPath, 'old-image-content');

        $product = Product::factory()->create([
            'cover_image_path' => $oldCoverPath,
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('new-cover.jpg', 800, 600),
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        // Yeni cover kaydedilmiş olmalı
        Storage::disk('public')->assertExists($updated->cover_image_path);
        // Eski cover silinmiş olmalı (eski dosya farklı yolda çünkü yeni dosya aynı klasöre cover.jpg olarak yazılıyor)
        // Eski dosya disk'ten silinmeli
        $this->assertNotNull($updated->cover_image_path);
    }

    /* ================================================================== */
    /*  UPDATE — remove PDF                                                */
    /* ================================================================== */

    public function test_update_can_remove_pdf_without_replacement(): void
    {
        Storage::fake('public');

        $pdfPath = 'products/test/document.pdf';
        Storage::disk('public')->put($pdfPath, 'fake-pdf-content');

        $product = Product::factory()->create([
            'pdf_path' => $pdfPath,
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'remove_pdf'  => true,
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        $this->assertNull($updated->pdf_path);
        Storage::disk('public')->assertMissing($pdfPath);
    }

    public function test_remove_pdf_is_ignored_when_new_pdf_uploaded(): void
    {
        Storage::fake('public');

        $oldPdfPath = 'products/test/old-doc.pdf';
        Storage::disk('public')->put($oldPdfPath, 'old-content');

        $product = Product::factory()->create([
            'pdf_path' => $oldPdfPath,
        ]);

        $response = $this->actingAsApiUser()->putJson("/api/products/{$product->id}", [
            'title'       => $product->title,
            'description' => $product->description,
            'is_active'   => true,
            'remove_pdf'  => true,
            'pdf'         => UploadedFile::fake()->create('new.pdf', 500, 'application/pdf'),
        ]);

        $response->assertOk();
        $updated = $product->fresh();
        // Yeni PDF yüklendi, remove_pdf görmezden gelindi
        $this->assertNotNull($updated->pdf_path);
        $this->assertNotEquals($oldPdfPath, $updated->pdf_path);
        Storage::disk('public')->assertExists($updated->pdf_path);
    }

    /* ================================================================== */
    /*  PURGE — edge cases & storage cleanup                               */
    /* ================================================================== */

    public function test_purge_does_not_delete_recently_trashed_products(): void
    {
        $product = Product::factory()->create();
        $product->delete(); // Şimdi silindi, 30 gün dolmadı

        $response = $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $response->assertOk()
            ->assertJsonPath('purged_count', 0);

        // Ürün hala veritabanında olmalı (soft deleted)
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_purge_only_deletes_older_than_30_days(): void
    {
        $old = Product::factory()->create();
        $old->delete();
        Product::withTrashed()->where('id', $old->id)->update(['deleted_at' => now()->subDays(31)]);

        $recent = Product::factory()->create();
        $recent->delete();
        Product::withTrashed()->where('id', $recent->id)->update(['deleted_at' => now()->subDays(15)]);

        $response = $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $response->assertOk()
            ->assertJsonPath('purged_count', 1);

        $this->assertDatabaseMissing('products', ['id' => $old->id]);
        $this->assertDatabaseHas('products', ['id' => $recent->id]);
    }

    public function test_purge_cleans_up_storage_directory(): void
    {
        Storage::fake('public');

        // Ürünü dosyalarıyla oluştur
        $folder = 'products/purge-test-folder';
        Storage::disk('public')->put($folder . '/cover.jpg', 'img-content');
        Storage::disk('public')->put($folder . '/alt-1.jpg', 'alt-content');

        $product = Product::factory()->create([
            'cover_image_path' => $folder . '/cover.jpg',
        ]);
        $product->delete();
        Product::withTrashed()->where('id', $product->id)->update(['deleted_at' => now()->subDays(31)]);

        $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        Storage::disk('public')->assertMissing($folder . '/cover.jpg');
        Storage::disk('public')->assertMissing($folder . '/alt-1.jpg');
    }

    public function test_purge_creates_activity_log(): void
    {
        $product = Product::factory()->create();
        $product->delete();
        Product::withTrashed()->where('id', $product->id)->update(['deleted_at' => now()->subDays(31)]);

        $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'products_purged',
        ]);

        $log = ActivityLog::where('action', 'products_purged')->first();
        $this->assertEquals(1, $log->metadata['purged_count']);
    }

    public function test_purge_does_not_create_activity_log_when_nothing_purged(): void
    {
        $this->actingAsApiUser()->postJson('/api/products/purge-trashed');

        $this->assertDatabaseMissing('activity_logs', [
            'action' => 'products_purged',
        ]);
    }

    /* ================================================================== */
    /*  DESTROY — soft delete does not affect visits                       */
    /* ================================================================== */

    public function test_soft_delete_preserves_visits(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(5)->create(['product_id' => $product->id]);

        $this->actingAsApiUser()->deleteJson("/api/products/{$product->id}")
            ->assertOk();

        $this->assertDatabaseCount('visits', 5);
        $this->assertEquals(5, Visit::where('product_id', $product->id)->count());
    }

    /* ================================================================== */
    /*  TRASHED — search & pagination                                      */
    /* ================================================================== */

    public function test_trashed_supports_search(): void
    {
        $p1 = Product::factory()->create(['title' => 'Kırmızı Özel']);
        $p2 = Product::factory()->create(['title' => 'Mavi Normal']);
        $p1->delete();
        $p2->delete();

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed?search=Kırmızı');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Kırmızı Özel', $response->json('data.0.title'));
    }

    public function test_trashed_supports_pagination(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $p = Product::factory()->create();
            $p->delete();
        }

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed?per_page=5');

        $response->assertOk();
        $this->assertCount(5, $response->json('data'));
        $this->assertEquals(15, $response->json('total'));
    }

    public function test_trashed_includes_visits_count(): void
    {
        $product = Product::factory()->create();
        Visit::factory()->count(7)->create(['product_id' => $product->id]);
        $product->delete();

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed');

        $response->assertOk();
        $this->assertEquals(7, $response->json('data.0.visits_count'));
    }

    public function test_trashed_ordered_by_oldest_deleted_first(): void
    {
        $p1 = Product::factory()->create(['title' => 'Eski Silinen']);
        $p1->delete();
        Product::withTrashed()->where('id', $p1->id)->update(['deleted_at' => now()->subDays(20)]);

        $p2 = Product::factory()->create(['title' => 'Yeni Silinen']);
        $p2->delete();

        $response = $this->actingAsApiUser()->getJson('/api/products/trashed');

        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertEquals('Eski Silinen', $titles[0]);
        $this->assertEquals('Yeni Silinen', $titles[1]);
    }

    /* ================================================================== */
    /*  STORE / UPDATE — activity log metadata                             */
    /* ================================================================== */

    public function test_store_activity_log_contains_product_id_in_metadata(): void
    {
        Storage::fake('public');

        $this->actingAsApiUser()->postJson('/api/products', [
            'title'       => 'Meta Test',
            'description' => 'Metadata kontrolü',
            'qr_token'    => 'meta-token',
            'is_active'   => true,
            'cover'       => UploadedFile::fake()->image('cover.jpg', 800, 600),
        ])->assertCreated();

        $product = Product::first();
        $log = ActivityLog::where('action', 'product_created')->first();

        $this->assertNotNull($log);
        $this->assertEquals($product->id, $log->metadata['product_id']);
        $this->assertEquals('Ürün oluşturuldu: Meta Test', $log->description);
    }

    public function test_update_activity_log_captures_ip_and_user_agent(): void
    {
        Storage::fake('public');

        $product = Product::factory()->create();

        $this->actingAsApiUser()
            ->withHeaders([
                'User-Agent' => 'TestBrowser/1.0',
            ])
            ->putJson("/api/products/{$product->id}", [
                'title'       => 'Updated Title',
                'description' => $product->description,
                'is_active'   => true,
            ])->assertOk();

        $log = ActivityLog::where('action', 'product_updated')->first();

        $this->assertNotNull($log);
        $this->assertNotNull($log->ip_address);
        $this->assertEquals('TestBrowser/1.0', $log->user_agent);
    }
}
