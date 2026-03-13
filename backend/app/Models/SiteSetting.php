<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $table = 'site_settings';

    protected $fillable = [
        'qr_enabled',
    ];

    protected $casts = [
        'qr_enabled' => 'boolean',
    ];
}

