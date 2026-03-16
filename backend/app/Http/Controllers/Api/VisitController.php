<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

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

        $ip = $request->ip();
        $location = $this->resolveLocation($ip);

        Visit::create([
            'product_id'  => $product->id,
            'ip_address'  => $ip,
            'location'    => $location,
            'device_type' => $deviceType,
            'user_agent'  => $userAgent,
            'visited_at'  => now(),
        ]);

        return response()->json(['message' => 'Visit recorded'], 201);
    }

    /**
     * Display a paginated listing of the visits.
     *
     * Query params:
     * - start_date  (Y-m-d)
     * - end_date    (Y-m-d)
     * - search      (ürün başlığı veya IP adresi)
     * - device_type (desktop|mobile|tablet)
     * - page        (sayfa numarası, varsayılan 1)
     * - per_page    (sayfa başına kayıt, varsayılan 10, maks 100)
     * - all         (1 ise sayfalama yapılmaz, tüm kayıtlar döner — Dashboard/Stats için)
     */
    public function index(Request $request)
    {
        $query = Visit::with(['product' => function ($q) {
            $q->withTrashed();
        }]);

        // Tarih filtreleri
        if ($startDate = $request->query('start_date')) {
            $query->where('visited_at', '>=', Carbon::parse($startDate)->startOfDay());
        }

        if ($endDate = $request->query('end_date')) {
            $query->where('visited_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        // Cihaz filtresi
        if ($deviceType = $request->query('device_type')) {
            $query->where('device_type', $deviceType);
        }

        // Arama (ürün başlığı veya IP adresi)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->withTrashed()->where('title', 'like', "%{$search}%");
                  });
            });
        }

        $query->orderByDesc('visited_at');

        // all=1 ise sayfalama yapma (Dashboard/Stats için)
        if ($request->query('all') === '1') {
            return response()->json($query->get());
        }

        $perPage = min((int) ($request->query('per_page', 10)), 100);

        return response()->json($query->paginate($perPage));
    }

    protected function resolveLocation(string $ip): ?string
    {
        try {
            // Localhost / private IP ise kendi IP'mizi sorgulat
            $isPrivate = in_array($ip, ['127.0.0.1', '::1']) ||
                         filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;

            $endpoint = $isPrivate
                ? 'https://api.ipinfo.io/lite/me'
                : "https://api.ipinfo.io/lite/{$ip}";

            $token = config('services.ipinfo.token');
            if (!$token) {
                return null;
            }

            $response = Http::withToken($token)
                ->timeout(3)
                ->get($endpoint);

            if ($response->successful()) {
                $data = $response->json();
                return $data['country'] ?? null;
            }
        } catch (\Throwable $e) {
            // Konum alınamazsa sessizce devam et
        }

        return null;
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

