<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\CarbonInterface;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ProductController extends Controller
{
    /**
     * Display a paginated listing of the resource.
     *
     * Query params:
     * - start_date  (Y-m-d)
     * - end_date    (Y-m-d)
     * - search      (ürün başlığı veya açıklama)
     * - status      (active|inactive)
     * - page        (sayfa numarası, varsayılan 1)
     * - per_page    (sayfa başına kayıt, varsayılan 10, maks 100)
     * - all         (1 ise sayfalama yapılmaz, tüm kayıtlar döner — Dashboard/Stats gibi sayfalar için)
     */
    public function index(Request $request)
    {
        $query = Product::withCount('visits');

        // Tarih filtreleri
        if ($startDate = $request->query('start_date')) {
            $query->where('created_at', '>=', Carbon::parse($startDate)->startOfDay());
        }

        if ($endDate = $request->query('end_date')) {
            $query->where('created_at', '<=', Carbon::parse($endDate)->endOfDay());
        }

        // Durum filtresi
        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Arama (başlık veya açıklama)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');

        // all=1 ise sayfalama yapma (Dashboard/Stats için)
        if ($request->query('all') === '1') {
            return $query->get();
        }

        $perPage = min((int) ($request->query('per_page', 10)), 100);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'                => ['required', 'string', 'max:255'],
            'description'          => ['required', 'string'],
            'youtube_url'          => ['nullable', 'string', 'max:255'],
            'qr_token'             => ['required', 'string', 'max:255'],
            'is_active'            => ['required', 'boolean'],
            'cover'                => ['required', 'file', 'image', 'max:5120'],   // 5MB
            'pdf'                  => ['nullable', 'file', 'mimes:pdf', 'max:10240'], // 10MB
            'alt_images'           => ['nullable', 'array'],
            'alt_images.*'         => ['file', 'image', 'max:5120'],
            'qr'                   => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $manager = new ImageManager(new Driver());

        $folder = 'products/' . Str::slug($validated['title']) . '-' . Str::random(8);

        $coverImage = $manager->read($request->file('cover')->getRealPath())
            ->scaleDown(1600)
            ->encodeByExtension('jpg', quality: 80);

        $coverPath = $folder . '/cover.jpg';
        Storage::disk('public')->put($coverPath, (string) $coverImage);

        $altImagePaths = [];
        if ($request->hasFile('alt_images')) {
            foreach ($request->file('alt_images') as $index => $file) {
                $image = $manager->read($file->getRealPath())
                    ->scaleDown(1600)
                    ->encodeByExtension('jpg', quality: 80);

                $path = $folder . '/alt-' . ($index + 1) . '.jpg';
                Storage::disk('public')->put($path, (string) $image);
                $altImagePaths[] = $path;
            }
        }

        $pdfPath = null;
        if ($request->hasFile('pdf')) {
            $pdfFile = $request->file('pdf');
            $pdfFileName = 'document-' . Str::random(8) . '.' . $pdfFile->getClientOriginalExtension();
            $pdfPath = $folder . '/' . $pdfFileName;
            Storage::disk('public')->putFileAs($folder, $pdfFile, $pdfFileName);
        }

        $qrImagePath = null;
        if ($request->hasFile('qr')) {
            $qrFile = $request->file('qr');
            $qrFileName = 'qr-' . Str::random(8) . '.' . $qrFile->getClientOriginalExtension();
            $qrImagePath = $folder . '/' . $qrFileName;
            Storage::disk('public')->putFileAs($folder, $qrFile, $qrFileName);
        }

        // Ayrıca QR token bilgisini klasör içine bir txt dosyası olarak yaz
        if (!empty($validated['qr_token'] ?? null)) {
            Storage::disk('public')->put($folder . '/qr-token.txt', $validated['qr_token']);
        }

        $product = Product::create([
            'title'            => $validated['title'],
            'description'      => $validated['description'],
            'youtube_url'      => $validated['youtube_url'] ?? null,
            'cover_image_path' => $coverPath,
            'pdf_path'         => $pdfPath,
            'alt_image_paths'  => $altImagePaths,
            'qr_image_path'    => $qrImagePath,
            'qr_token'         => $validated['qr_token'],
            'is_active'        => $validated['is_active'],
        ]);

        if ($request->user()) {
            ActivityLog::create([
                'user_id'      => $request->user()->id,
                'action'       => 'product_created',
                'subject_type' => Product::class,
                'subject_id'   => $product->id,
                'description'  => 'Ürün oluşturuldu: ' . ($product->title ?? ''),
                'ip_address'   => $request->ip(),
                'user_agent'   => (string) $request->header('User-Agent'),
                'metadata'     => [
                    'product_id' => $product->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Product created',
            'data'    => $product,
        ], 201);
    }

    /**
     * Display the specified resource (admin: includes trashed).
     */
    public function show(string $id)
    {
        $product = Product::withTrashed()->findOrFail($id);
        return response()->json($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $product = Product::withTrashed()->findOrFail($id);
        if ($product->trashed()) {
            return response()->json([
                'message' => 'Ürün çöp kutusunda. Önce geri getirmelisiniz.',
            ], 422);
        }

        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'youtube_url' => ['nullable', 'string', 'max:255'],
            'is_active'   => ['required', 'boolean'],
            'cover'       => ['nullable', 'file', 'image', 'max:5120'],
            'pdf'         => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'alt_images'  => ['nullable', 'array'],
            'alt_images.*'=> ['file', 'image', 'max:5120'],
        ]);

        $manager = new ImageManager(new Driver());

        // Klasör: ürün oluşturulurken kullanılan klasör, mevcut cover path'inden türetilir
        $folder = $product->cover_image_path
            ? dirname($product->cover_image_path)
            : 'products/' . Str::slug($validated['title']) . '-' . Str::random(8);

        $coverPath = $product->cover_image_path;
        if ($request->hasFile('cover')) {
            if ($coverPath && Storage::disk('public')->exists($coverPath)) {
                Storage::disk('public')->delete($coverPath);
            }

            $coverImage = $manager->read($request->file('cover')->getRealPath())
                ->scaleDown(1600)
                ->encodeByExtension('jpg', quality: 80);

            $coverPath = $folder . '/cover.jpg';
            Storage::disk('public')->put($coverPath, (string) $coverImage);
        }

        $altImagePaths = $product->alt_image_paths ?? [];
        if ($request->hasFile('alt_images')) {
            // Eski alt görselleri sil
            foreach ($altImagePaths as $oldPath) {
                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $altImagePaths = [];
            foreach ($request->file('alt_images') as $index => $file) {
                $image = $manager->read($file->getRealPath())
                    ->scaleDown(1600)
                    ->encodeByExtension('jpg', quality: 80);

                $path = $folder . '/alt-' . ($index + 1) . '.jpg';
                Storage::disk('public')->put($path, (string) $image);
                $altImagePaths[] = $path;
            }
        }

        $pdfPath = $product->pdf_path;
        if ($request->hasFile('pdf')) {
            if ($pdfPath && Storage::disk('public')->exists($pdfPath)) {
                Storage::disk('public')->delete($pdfPath);
            }

            $pdfFile = $request->file('pdf');
            $pdfFileName = 'document-' . Str::random(8) . '.' . $pdfFile->getClientOriginalExtension();
            $pdfPath = $folder . '/' . $pdfFileName;
            Storage::disk('public')->putFileAs($folder, $pdfFile, $pdfFileName);
        }

        $product->update([
            'title'            => $validated['title'],
            'description'      => $validated['description'],
            'youtube_url'      => $validated['youtube_url'] ?? null,
            'cover_image_path' => $coverPath,
            'pdf_path'         => $pdfPath,
            'alt_image_paths'  => $altImagePaths,
            'is_active'        => $validated['is_active'],
        ]);

        if ($request->user()) {
            ActivityLog::create([
                'user_id'      => $request->user()->id,
                'action'       => 'product_updated',
                'subject_type' => Product::class,
                'subject_id'   => $product->id,
                'description'  => 'Ürün güncellendi: ' . ($product->title ?? ''),
                'ip_address'   => $request->ip(),
                'user_agent'   => (string) $request->header('User-Agent'),
                'metadata'     => [
                    'product_id' => $product->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Product updated',
            'data'    => $product->fresh(),
        ]);
    }

    /**
     * Soft delete: move product to trash (30-day recovery period).
     */
    public function destroy(string $id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        if (request()->user()) {
            ActivityLog::create([
                'user_id'      => request()->user()->id,
                'action'       => 'product_deleted',
                'subject_type' => Product::class,
                'subject_id'   => $product->id,
                'description'  => 'Ürün çöp kutusuna taşındı: ' . ($product->title ?? ''),
                'ip_address'   => request()->ip(),
                'user_agent'   => (string) request()->header('User-Agent'),
                'metadata'     => [
                    'product_id' => $product->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Ürün çöp kutusuna taşındı. 30 gün içinde geri getirebilirsiniz.',
        ]);
    }

    /**
     * Restore a trashed product.
     */
    public function restore(string $id)
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        if (request()->user()) {
            ActivityLog::create([
                'user_id'      => request()->user()->id,
                'action'       => 'product_restored',
                'subject_type' => Product::class,
                'subject_id'   => $product->id,
                'description'  => 'Ürün geri getirildi: ' . ($product->title ?? ''),
                'ip_address'   => request()->ip(),
                'user_agent'   => (string) request()->header('User-Agent'),
                'metadata'     => [
                    'product_id' => $product->id,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Ürün geri getirildi.',
            'data'    => $product->fresh(),
        ]);
    }

    /**
     * List trashed products (paginated).
     */
    public function trashed(Request $request)
    {
        // Önce kalıcı silinmesine en az süre kalan ürünler (en eski deleted_at)
        // ardından silinme tarihine göre sırala.
        $query = Product::onlyTrashed()
            ->withCount('visits')
            ->orderBy('deleted_at', 'asc');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) ($request->query('per_page', 10)), 100);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Purge products that have been in trash for more than 30 days (permanent delete + storage cleanup).
     * Safe to call on every dashboard/trash page load. Only selects id + cover_image_path for speed.
     */
    public function purgeTrashed()
    {
        $cutoff = now()->subDays(30);
        $products = Product::onlyTrashed()
            ->where('deleted_at', '<', $cutoff)
            ->get(['id', 'cover_image_path']);
        $count = 0;
        foreach ($products as $product) {
            $folder = $product->cover_image_path ? dirname($product->cover_image_path) : null;
            if ($folder) {
                Storage::disk('public')->deleteDirectory($folder);
            }
            Product::withTrashed()->where('id', $product->id)->forceDelete();
            $count++;
        }
        if (request()->user() && $count > 0) {
            ActivityLog::create([
                'user_id'      => request()->user()->id,
                'action'       => 'products_purged',
                'subject_type' => Product::class,
                'subject_id'   => null,
                'description'  => "{$count} ürün kalıcı olarak silindi.",
                'ip_address'   => request()->ip(),
                'user_agent'   => (string) request()->header('User-Agent'),
                'metadata'     => [
                    'purged_count' => $count,
                ],
            ]);
        }

        return response()->json([
            'message' => $count > 0 ? "{$count} ürün kalıcı olarak silindi." : 'Silinecek ürün yok.',
            'purged_count' => $count,
        ]);
    }

    /**
     * Display a public product by QR token.
     */
    public function showByToken(string $token)
    {
        $product = Product::where('qr_token', $token)->firstOrFail();

        if (!$product->is_active) {
            return response()->json([
                'inactive' => true,
                'message'  => 'Bu ürün şu anda kullanıma kapalıdır.',
            ], 200);
        }

        return response()->json($product);
    }
}
