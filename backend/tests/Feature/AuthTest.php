<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /* ------------------------------------------------------------------ */
    /*  LOGIN                                                              */
    /* ------------------------------------------------------------------ */

    public function test_login_success_returns_token_and_user(): void
    {
        User::factory()->create([
            'email' => 'admin@test.com',
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']])
            ->assertJsonPath('user.email', 'admin@test.com');

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email' => 'admin@test.com',
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'admin@test.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnauthorized()
            ->assertJsonFragment(['message' => 'E-posta veya şifre hatalı.']);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'nobody@test.com',
            'password' => 'password',
        ]);

        $response->assertUnauthorized()
            ->assertJsonFragment(['message' => 'E-posta veya şifre hatalı.']);
    }

    public function test_login_requires_email(): void
    {
        $response = $this->postJson('/api/login', [
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_login_requires_valid_email_format(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'not-an-email',
            'password' => 'password',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_login_requires_password(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    /* ------------------------------------------------------------------ */
    /*  LOGOUT                                                             */
    /* ------------------------------------------------------------------ */

    public function test_logout_success(): void
    {
        $this->actingAsApiUser();

        $response = $this->postJson('/api/logout');

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Çıkış yapıldı.']);
    }

    public function test_logout_requires_authentication(): void
    {
        $response = $this->postJson('/api/logout');

        $response->assertUnauthorized();
    }

    /* ------------------------------------------------------------------ */
    /*  ME                                                                */
    /* ------------------------------------------------------------------ */

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create(['email' => 'me@test.com']);
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('email', 'me@test.com')
            ->assertJsonStructure(['id', 'name', 'email']);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertUnauthorized();
    }

    /* ------------------------------------------------------------------ */
    /*  CHANGE PASSWORD                                                    */
    /* ------------------------------------------------------------------ */

    public function test_change_password_success(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('old-secret'),
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->putJson('/api/change-password', [
            'current_password'      => 'old-secret',
            'new_password'          => 'new-secret-123',
            'new_password_confirmation' => 'new-secret-123',
        ]);

        $response->assertOk()
            ->assertJsonFragment(['message' => 'Şifre başarıyla değiştirildi. Lütfen tekrar giriş yapın.']);

        $user->refresh();
        $this->assertTrue(Hash::check('new-secret-123', $user->password));
    }

    public function test_change_password_fails_with_wrong_current_password(): void
    {
        User::factory()->create(['password' => Hash::make('actual-secret')]);

        $this->actingAsApiUser();

        $response = $this->putJson('/api/change-password', [
            'current_password'          => 'wrong-current',
            'new_password'              => 'new-secret-123',
            'new_password_confirmation' => 'new-secret-123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Mevcut şifre hatalı.']);
    }

    public function test_change_password_requires_current_password(): void
    {
        $this->actingAsApiUser();

        $response = $this->putJson('/api/change-password', [
            'new_password'          => 'new-secret-123',
            'new_password_confirmation' => 'new-secret-123',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');
    }

    public function test_change_password_requires_new_password_min_length(): void
    {
        $this->actingAsApiUser();

        $response = $this->putJson('/api/change-password', [
            'current_password'          => 'password',
            'new_password'              => 'short',
            'new_password_confirmation' => 'short',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('new_password');
    }

    public function test_change_password_requires_confirmation_match(): void
    {
        $this->actingAsApiUser();

        $response = $this->putJson('/api/change-password', [
            'current_password'          => 'password',
            'new_password'              => 'new-secret-123',
            'new_password_confirmation' => 'different',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('new_password');
    }

    public function test_change_password_requires_authentication(): void
    {
        $response = $this->putJson('/api/change-password', [
            'current_password'          => 'password',
            'new_password'              => 'new-secret-123',
            'new_password_confirmation' => 'new-secret-123',
        ]);

        $response->assertUnauthorized();
    }
}
