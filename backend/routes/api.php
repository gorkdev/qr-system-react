<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\VisitController;

Route::apiResource('products', ProductController::class);

Route::get('products/token/{token}', [ProductController::class, 'showByToken']);

Route::get('visits', [VisitController::class, 'index']);
Route::post('visits', [VisitController::class, 'store']);
