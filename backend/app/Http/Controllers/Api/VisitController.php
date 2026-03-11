<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Visit;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    /**
     * Store a newly created visit.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $product = Product::findOrFail($data['product_id']);

        $userAgent = $request->userAgent() ?? '';
        $deviceType = $this->detectDeviceType($userAgent);

        Visit::create([
            'product_id'  => $product->id,
            'ip_address'  => $request->ip(),
            'location'    => null,
            'device_type' => $deviceType,
            'user_agent'  => $userAgent,
            'visited_at'  => now(),
        ]);

        return response()->json(['message' => 'Visit recorded'], 201);
    }

    /**
     * Display a listing of the visits.
     */
    public function index()
    {
        $visits = Visit::with('product')
            ->orderByDesc('visited_at')
            ->limit(500)
            ->get();

        return response()->json($visits);
    }

    protected function detectDeviceType(string $userAgent): string
    {
        $ua = strtolower($userAgent);

        if (str_contains($ua, 'ipad') || str_contains($ua, 'tablet')) {
            return 'tablet';
        }

        if (str_contains($ua, 'mobi')) {
            return 'mobile';
        }

        return 'desktop';
    }

    protected function detectBrowserLabel(string $userAgent): string
    {
        $ua = strtolower($userAgent);

        if (str_contains($ua, 'edg/')) {
            return 'Microsoft Edge';
        }

        if (str_contains($ua, 'opr/') || str_contains($ua, 'opera')) {
            return 'Opera';
        }

        if (str_contains($ua, 'firefox/')) {
            return 'Firefox';
        }

        if (str_contains($ua, 'chrome/')) {
            return 'Chrome';
        }

        if (str_contains($ua, 'safari/')) {
            return 'Safari';
        }

        return 'Diğer';
    }
}

