<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TraitesStatsController;
use App\Http\Controllers\TraitesController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');


// Statistiques traites
Route::get('/traites/stats', [TraitesStatsController::class, 'stats']);
Route::get('/traites/monthly', [TraitesStatsController::class, 'monthly']);
Route::get('/traites/status', [TraitesStatsController::class, 'statusBreakdown']);

// Historique des traites (avec utilisateur) - placer AVANT la route paramétrée
Route::get('/traites/historique', [TraitesController::class, 'historique']);

// CRUD Traites
Route::get('/traites', [TraitesController::class, 'index']);
Route::post('/traites', [TraitesController::class, 'store'])->middleware('auth:sanctum');
Route::get('/traites/{traite}', [TraitesController::class, 'show']);
Route::put('/traites/{traite}', [TraitesController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/traites/{traite}', [TraitesController::class, 'destroy'])->middleware('auth:sanctum');
Route::patch('/traites/{traite}/statut', [TraitesController::class, 'updateStatus'])->middleware('auth:sanctum');