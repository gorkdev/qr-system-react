<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SiteSettingController extends Controller
{
    /**
     * Get current site settings (singleton).
     */
    public function show()
    {
        $setting = SiteSetting::query()->first();

        if (!$setting) {
            $setting = SiteSetting::create([
                'qr_enabled' => true,
            ]);
        }

        return response()->json($setting);
    }

    /**
     * Update site settings.
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'qr_enabled' => ['required', 'boolean'],
        ]);

        $setting = SiteSetting::query()->first();

        if (!$setting) {
            $setting = new SiteSetting();
        }

        $setting->qr_enabled = $data['qr_enabled'];
        $setting->save();

        return response()->json([
            'message' => 'Site settings updated.',
            'data'    => $setting,
        ]);
    }
}

