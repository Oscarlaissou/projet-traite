<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TraitesStatsController;
use App\Http\Controllers\TraitesController;
use App\Http\Controllers\TiersController;
use App\Http\Controllers\ClientStatsController;
use App\Http\Controllers\Api\UserController;

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


// User management routes
Route::prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index'])->middleware('auth:sanctum');
    Route::post('/', [UserController::class, 'store'])->middleware('auth:sanctum');
    Route::get('/{id}', [UserController::class, 'show'])->middleware('auth:sanctum');
    Route::put('/{id}', [UserController::class, 'update'])->middleware('auth:sanctum');
    Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('auth:sanctum');
    
    // Permissions routes
    Route::get('/{id}/permissions', [UserController::class, 'getUserPermissions'])->middleware('auth:sanctum');
    Route::put('/{id}/permissions', [UserController::class, 'updateUserPermissions'])->middleware('auth:sanctum');
});

// Permissions routes
Route::get('/permissions', [UserController::class, 'getPermissions'])->middleware('auth:sanctum');

// Organization settings routes
Route::prefix('organization')->group(function () {
    Route::get('/settings', [UserController::class, 'getOrganizationSettings'])->middleware('auth:sanctum');
    Route::put('/settings', [UserController::class, 'updateOrganizationSettings'])->middleware('auth:sanctum');
});

// Statistiques traites
Route::get('/traites/stats', [TraitesStatsController::class, 'stats']);
Route::get('/traites/monthly', [TraitesStatsController::class, 'monthly']);
Route::get('/traites/status', [TraitesStatsController::class, 'statusBreakdown']);
Route::get('/traites/available-years', [TraitesStatsController::class, 'availableYears']);

// Grille des clients (tiers)
Route::get('/tiers', [TiersController::class, 'index']);
Route::post('/tiers', [TiersController::class, 'store'])->middleware('auth:sanctum');
Route::post('/tiers/import-csv', [TiersController::class, 'importCsv'])->middleware('auth:sanctum');
Route::get('/agences', [TiersController::class, 'agences'])->middleware('auth:sanctum');
Route::get('/tiers/historique', [TiersController::class, 'historique']);
Route::get('/tiers/{tier}', [TiersController::class, 'show']);
Route::put('/tiers/{tier}', [TiersController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/tiers/{tier}', [TiersController::class, 'destroy'])->middleware('auth:sanctum');

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


Route::prefix('clients')->group(function () {
    Route::get('/stats', [ClientStatsController::class, 'stats']);
    Route::get('/available-years', [ClientStatsController::class, 'availableYears']);
    Route::get('/monthly', [ClientStatsController::class, 'monthly']);
    Route::get('/type-breakdown', [ClientStatsController::class, 'typeBreakdown']);
});

// Routes pour les paramètres d'organisation
Route::middleware('auth:sanctum')->group(function () {
    // Récupérer les paramètres de l'organisation
    Route::get('/organization/settings', [UserController::class, 'getOrganizationSettings']);
    
    // Mettre à jour les paramètres de l'organisation (utilisez POST pour FormData)
    Route::post('/organization/settings', [UserController::class, 'updateOrganizationSettings']);
});
