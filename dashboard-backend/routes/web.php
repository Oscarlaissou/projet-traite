<?php

// Dans routes/web.php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TraitesController;

Route::get('/test-db', function () {
    try {
        // Test simple de la connexion
        DB::connection()->getPdo();
        
        // Test avec une requête basique
        $result = DB::select('SELECT 1 as test');
        
        return response()->json([
            'status' => 'success',
            'message' => 'Connexion à la base de données réussie!',
            'database' => config('database.default'),
            'host' => config('database.connections.' . config('database.default') . '.host'),
            'database_name' => config('database.connections.' . config('database.default') . '.database'),
            'test_query' => $result[0]->test ?? 'N/A'
        ], 200);
        
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Erreur de connexion à la base de données',
            'error' => $e->getMessage(),
            'database_config' => config('database.default')
        ], 500);
    }
});

// Impression d'une traite (vue HTML imprimable)
Route::get('/print/traites/{traite}/{index?}', [TraitesController::class, 'print'])
    ->whereNumber('index')
    ->name('traites.print');

// Aperçu multi-pages: afficher toutes les traites et bouton Imprimer
Route::get('/print/traites/{traite}/preview', [TraitesController::class, 'preview'])
    ->name('traites.preview');

