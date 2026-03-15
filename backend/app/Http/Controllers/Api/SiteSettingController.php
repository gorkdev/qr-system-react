<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use App\Models\ActivityLog;

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

        $oldEnabled = (bool) ($setting->qr_enabled ?? false);
        $setting->qr_enabled = $data['qr_enabled'];
        $setting->save();

        if ($request->user()) {
            ActivityLog::create([
                'user_id'      => $request->user()->id,
                'action'       => 'site_settings_updated',
                'subject_type' => SiteSetting::class,
                'subject_id'   => $setting->id,
                'description'  => 'Site ayarları güncellendi.',
                'ip_address'   => $request->ip(),
                'user_agent'   => (string) $request->header('User-Agent'),
                'metadata'     => [
                    'qr_enabled_before' => $oldEnabled,
                    'qr_enabled_after'  => (bool) $setting->qr_enabled,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Site settings updated.',
            'data'    => $setting,
        ]);
    }
}

