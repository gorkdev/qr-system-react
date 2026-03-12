<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Product::withCount('visits')->get();
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
        return response()->json([
            'message' => 'Product created',
            'data'    => $product,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Product::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

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

        return response()->json([
            'message' => 'Product updated',
            'data'    => $product->fresh(),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Display a public product by QR token.
     */
    public function showByToken(string $token)
    {
        $product = Product::where('qr_token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($product);
    }
}
