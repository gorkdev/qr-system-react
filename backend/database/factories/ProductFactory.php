<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'title'            => fake()->sentence(3),
            'description'      => fake()->paragraph(),
            'youtube_url'      => null,
            'cover_image_path' => 'products/test/cover.jpg',
            'pdf_path'         => null,
            'alt_image_paths'  => [],
            'qr_image_path'    => null,
            'qr_token'         => Str::uuid()->toString(),
            'is_active'        => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
