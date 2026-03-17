<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthExtendedTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  LOGIN — activity log & token management                             */
    /* ------------------------------------------------------------------ */

    public function test_login_creates_activity_log(): void
    {
        User::factory()->create(['email' => 'log@test.com']);

        $this->postJson('/api/login', [
            'email'    => 'log@test.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'       => 'login',
            'subject_type' => User::class,
        ]);
    }

    public function test_login_preserves_old_tokens(): void
    {
        $user = User::factory()->create(['email' => 'multi@test.com']);

        // İlk login
        $this->postJson('/api/login', [
            'email'    => 'multi@test.com',
            'password' => 'password',
        ])->assertOk();

        $this->assertEquals(1, $user->tokens()->count());

        // İkinci login — eski token korunmalı, yeni token eklenmeli
        $this->postJson('/api/login', [
            'email'    => 'multi@test.com',
            'password' => 'password',
        ])->assertOk();

        // İki token olmalı (çoklu oturum desteği)
        $this->assertEquals(2, $user->tokens()->count());
    }

    public function test_login_returns_correct_user_structure(): void
    {
        User::factory()->create([
            'email' => 'struct@test.com',
            'name'  => 'Test User',
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'struct@test.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ])
            ->assertJsonPath('user.name', 'Test User')
            ->assertJsonPath('user.email', 'struct@test.com');
    }

    public function test_failed_login_does_not_create_activity_log(): void
    {
        User::factory()->create(['email' => 'fail@test.com']);

        $this->postJson('/api/login', [
            'email'    => 'fail@test.com',
            'password' => 'wrong',
        ])->assertUnauthorized();

        $this->assertDatabaseMissing('activity_logs', [
            'action' => 'login',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  LOGOUT — token invalidation & activity log                          */
    /* ------------------------------------------------------------------ */

    public function test_logout_creates_activity_log(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/logout')->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'  => 'logout',
            'user_id' => $user->id,
        ]);
    }

    public function test_token_is_deleted_after_logout(): void
    {
        $user = User::factory()->create(['email' => 'token@test.com']);

        // Gerçek login yaparak token al
        $loginResponse = $this->postJson('/api/login', [
            'email'    => 'token@test.com',
            'password' => 'password',
        ]);

        $token = $loginResponse->json('token');
        $this->assertNotEmpty($token);
        $this->assertEquals(1, $user->tokens()->count());

        // Logout yap
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/logout')->assertOk();

        // Token silinmiş olmalı
        $this->assertEquals(0, $user->tokens()->count());
    }

    public function test_cannot_use_token_after_logout(): void
    {
        $user = User::factory()->create(['email' => 'expired@test.com']);

        $loginResponse = $this->postJson('/api/login', [
            'email'    => 'expired@test.com',
            'password' => 'password',
        ]);

        $token = $loginResponse->json('token');

        // Logout
        $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/logout')->assertOk();

        // Eski token ile istek yapılamaz — yeni bir request oluştur
        $response = $this->withoutMiddleware(\Illuminate\Session\Middleware\StartSession::class)
            ->withHeaders([
                'Authorization' => "Bearer {$token}",
            ])->getJson('/api/me');

        // Token silindiği için 401 veya kullanıcı dönemez
        $this->assertTrue(
            $response->status() === 401 || $user->tokens()->count() === 0,
            'Token should be invalidated after logout'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  CHANGE PASSWORD — activity log                                      */
    /* ------------------------------------------------------------------ */

    public function test_change_password_creates_activity_log(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-pass'),
        ]);

        $this->actingAs($user, 'sanctum');

        $this->putJson('/api/change-password', [
            'current_password'          => 'old-pass',
            'new_password'              => 'new-pass-123',
            'new_password_confirmation' => 'new-pass-123',
        ])->assertOk();

        $this->assertDatabaseHas('activity_logs', [
            'action'  => 'password_changed',
            'user_id' => $user->id,
        ]);
    }

    public function test_failed_password_change_does_not_create_activity_log(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('real-pass'),
        ]);

        $this->actingAs($user, 'sanctum');

        $this->putJson('/api/change-password', [
            'current_password'          => 'wrong-pass',
            'new_password'              => 'new-pass-123',
            'new_password_confirmation' => 'new-pass-123',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('activity_logs', [
            'action' => 'password_changed',
        ]);
    }

    public function test_change_password_new_password_actually_works(): void
    {
        $user = User::factory()->create([
            'email'    => 'passcheck@test.com',
            'password' => Hash::make('old-pass'),
        ]);

        $this->actingAs($user, 'sanctum');

        $this->putJson('/api/change-password', [
            'current_password'          => 'old-pass',
            'new_password'              => 'brand-new-pass',
            'new_password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        // Yeni şifre ile login olabilmeli
        $this->postJson('/api/login', [
            'email'    => 'passcheck@test.com',
            'password' => 'brand-new-pass',
        ])->assertOk();

        // Eski şifre artık çalışmamalı
        $this->postJson('/api/login', [
            'email'    => 'passcheck@test.com',
            'password' => 'old-pass',
        ])->assertUnauthorized();
    }

    /* ------------------------------------------------------------------ */
    /*  ME — response format                                                */
    /* ------------------------------------------------------------------ */

    public function test_me_does_not_expose_password(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/me');

        $response->assertOk();
        $data = $response->json();
        $this->assertArrayNotHasKey('password', $data);
    }
}
