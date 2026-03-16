<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogExtendedTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  INDEX — filter by action                                            */
    /* ------------------------------------------------------------------ */

    public function test_index_filters_by_action(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create(['action' => 'login', 'description' => 'Giriş yapıldı']);
        ActivityLog::create(['action' => 'product_created', 'description' => 'Ürün oluşturuldu']);
        ActivityLog::create(['action' => 'login', 'description' => 'Tekrar giriş']);

        $response = $this->getJson('/api/activity-logs?action=login');

        $response->assertOk();
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_index_filters_by_user_id(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        ActivityLog::create(['user_id' => $user1->id, 'action' => 'login', 'description' => 'User1 giriş']);
        ActivityLog::create(['user_id' => $user2->id, 'action' => 'login', 'description' => 'User2 giriş']);
        ActivityLog::create(['user_id' => $user1->id, 'action' => 'logout', 'description' => 'User1 çıkış']);

        $response = $this->actingAs($user1, 'sanctum')
            ->getJson("/api/activity-logs?user_id={$user1->id}");

        $response->assertOk();
        $this->assertEquals(2, $response->json('total'));
    }

    public function test_index_filters_by_search_description(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create(['action' => 'product_created', 'description' => 'Ürün oluşturuldu: Kırmızı Halı']);
        ActivityLog::create(['action' => 'product_created', 'description' => 'Ürün oluşturuldu: Mavi Perde']);
        ActivityLog::create(['action' => 'login', 'description' => 'Kullanıcı giriş yaptı']);

        $response = $this->getJson('/api/activity-logs?search=Kırmızı');

        $response->assertOk();
        $this->assertEquals(1, $response->json('total'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — ordering                                                    */
    /* ------------------------------------------------------------------ */

    public function test_index_is_ordered_by_created_at_descending(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create([
            'action' => 'login',
            'description' => 'Eski',
            'created_at' => now()->subDays(2),
        ]);
        ActivityLog::create([
            'action' => 'login',
            'description' => 'Yeni',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/activity-logs');

        $descriptions = collect($response->json('data'))->pluck('description')->all();
        $this->assertEquals('Yeni', $descriptions[0]);
        $this->assertEquals('Eski', $descriptions[1]);
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — pagination                                                  */
    /* ------------------------------------------------------------------ */

    public function test_index_per_page_capped_at_100(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create(['action' => 'login', 'description' => 'test']);

        $response = $this->getJson('/api/activity-logs?per_page=500');

        $response->assertOk();
        $this->assertEquals(100, $response->json('per_page'));
    }

    public function test_index_default_per_page_is_20(): void
    {
        $this->actingAsApiUser();

        for ($i = 0; $i < 25; $i++) {
            ActivityLog::create(['action' => 'login', 'description' => "Log {$i}"]);
        }

        $response = $this->getJson('/api/activity-logs');

        $response->assertOk();
        $this->assertCount(20, $response->json('data'));
        $this->assertEquals(25, $response->json('total'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — includes user relationship                                  */
    /* ------------------------------------------------------------------ */

    public function test_index_includes_user_relationship(): void
    {
        $user = User::factory()->create(['name' => 'Admin User']);
        $this->actingAs($user, 'sanctum');

        ActivityLog::create([
            'user_id'     => $user->id,
            'action'      => 'login',
            'description' => 'Giriş yapıldı',
        ]);

        $response = $this->getJson('/api/activity-logs');

        $response->assertOk()
            ->assertJsonPath('data.0.user.name', 'Admin User');
    }

    public function test_index_handles_null_user_id(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create([
            'user_id'     => null,
            'action'      => 'system',
            'description' => 'Sistem işlemi',
        ]);

        $response = $this->getJson('/api/activity-logs');

        $response->assertOk();
        $this->assertNull($response->json('data.0.user'));
    }

    /* ------------------------------------------------------------------ */
    /*  INDEX — combined filters                                            */
    /* ------------------------------------------------------------------ */

    public function test_index_combines_action_and_search_filters(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create(['action' => 'product_created', 'description' => 'Ürün: Halı']);
        ActivityLog::create(['action' => 'product_created', 'description' => 'Ürün: Perde']);
        ActivityLog::create(['action' => 'login', 'description' => 'Halı kullanıcısı giriş yaptı']);

        $response = $this->getJson('/api/activity-logs?action=product_created&search=Halı');

        $response->assertOk();
        $this->assertEquals(1, $response->json('total'));
    }

    /* ------------------------------------------------------------------ */
    /*  Activity log structure                                              */
    /* ------------------------------------------------------------------ */

    public function test_activity_log_response_structure(): void
    {
        $this->actingAsApiUser();

        ActivityLog::create([
            'action'       => 'product_created',
            'description'  => 'Test',
            'ip_address'   => '127.0.0.1',
            'user_agent'   => 'TestAgent',
            'metadata'     => ['key' => 'value'],
        ]);

        $response = $this->getJson('/api/activity-logs');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id', 'user_id', 'action', 'subject_type', 'subject_id',
                        'description', 'ip_address', 'user_agent', 'metadata',
                        'created_at', 'updated_at',
                    ],
                ],
                'current_page', 'total', 'per_page',
            ]);
    }
}
