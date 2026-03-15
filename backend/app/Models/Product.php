<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'youtube_url',
        'cover_image_path',
        'pdf_path',
        'alt_image_paths',
        'qr_image_path',
        'qr_token',
        'is_active',
    ];

    protected $casts = [
        'alt_image_paths' => 'array',
        'is_active'       => 'boolean',
    ];

    public function visits()
    {
        return $this->hasMany(Visit::class);
    }

    protected static function booted(): void
    {
        static::forceDeleting(function (Product $product): void {
            $folder = $product->cover_image_path ? dirname($product->cover_image_path) : null;
            if ($folder) {
                \Illuminate\Support\Facades\Storage::disk('public')->deleteDirectory($folder);
            }
        });
    }
}
