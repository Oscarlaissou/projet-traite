<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TraitesStatsController;
use App\Http\Controllers\TraitesController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

// Route de test CORS
Route::get('/test-cors', function() {
    return response()->json(['message' => 'CORS fonctionne !', 'timestamp' => now()])
        ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true');
});

// Route de test simple pour l'importation
Route::post('/test-import', function() {
    return response()->json(['message' => 'Test import OK', 'data' => request()->all()])
        ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true');
});


// Statistiques traites
Route::get('/traites/stats', [TraitesStatsController::class, 'stats']);
Route::get('/traites/monthly', [TraitesStatsController::class, 'monthly']);
Route::get('/traites/status', [TraitesStatsController::class, 'statusBreakdown']);
Route::get('/traites/available-years', [TraitesStatsController::class, 'availableYears']);

// Historique des traites (avec utilisateur) - placer AVANT la route paramétrée
Route::get('/traites/historique', [TraitesController::class, 'historique']);

// CRUD Traites
Route::get('/traites', [TraitesController::class, 'index']);
Route::post('/traites', [TraitesController::class, 'store'])->middleware('auth:sanctum');
Route::options('/traites/import-csv', function() {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true');
});
Route::post('/traites/import-csv', [TraitesController::class, 'importCsv']); // Temporairement sans auth pour test
Route::get('/traites/{traite}', [TraitesController::class, 'show']);
Route::put('/traites/{traite}', [TraitesController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/traites/{traite}', [TraitesController::class, 'destroy'])->middleware('auth:sanctum');
Route::patch('/traites/{traite}/statut', [TraitesController::class, 'updateStatus'])->middleware('auth:sanctum');