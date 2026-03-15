<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\VisitController;

// Public routes
Route::post('login', [AuthController::class, 'login']);
Route::get('products/token/{token}', [ProductController::class, 'showByToken']);
Route::post('visits', [VisitController::class, 'store']);
Route::get('site-settings', [SiteSettingController::class, 'show']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::put('change-password', [AuthController::class, 'changePassword']);

    Route::get('products/trashed', [ProductController::class, 'trashed']);
    Route::post('products/purge-trashed', [ProductController::class, 'purgeTrashed']);
    Route::post('products/{id}/restore', [ProductController::class, 'restore']);
    Route::apiResource('products', ProductController::class);
    Route::get('visits', [VisitController::class, 'index']);
    Route::put('site-settings', [SiteSettingController::class, 'update']);
});
