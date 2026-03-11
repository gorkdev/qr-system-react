<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
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
}
