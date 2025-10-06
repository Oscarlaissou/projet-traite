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

// CRUD Traites
Route::get('/traites', [TraitesController::class, 'index']);
Route::post('/traites', [TraitesController::class, 'store']);
Route::get('/traites/{traite}', [TraitesController::class, 'show']);
Route::put('/traites/{traite}', [TraitesController::class, 'update']);
Route::delete('/traites/{traite}', [TraitesController::class, 'destroy']);
Route::patch('/traites/{traite}/statut', [TraitesController::class, 'updateStatus']);
