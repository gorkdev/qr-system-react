<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

class VisitFactory extends Factory
{
    protected $model = Visit::class;

    public function definition(): array
    {
        return [
            'product_id'  => Product::factory(),
            'ip_address'  => fake()->ipv4(),
            'location'    => null,
            'device_type' => fake()->randomElement(['desktop', 'mobile', 'tablet']),
            'user_agent'  => fake()->userAgent(),
            'visited_at'  => now()->subMinutes(fake()->numberBetween(1, 10000)),
        ];
    }
}
