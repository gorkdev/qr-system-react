<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Authenticate as a random API user for protected routes.
     * Call before requests to /api/* that require auth:sanctum.
     */
    protected function actingAsApiUser(): static
    {
        Sanctum::actingAs(User::factory()->create());
        return $this;
    }
}
