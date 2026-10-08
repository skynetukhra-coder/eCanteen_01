<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return response()->json([
        'success' => true,
        'message' => 'eCanteen Laravel API Server Running'
    ]);
});

// Single Page Application Fallback for React routing
Route::fallback(function () {
    $indexPath = public_path('index.html');
    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }
    return response()->json([
        'success' => false,
        'message' => 'Route not found'
    ], 404);
});
