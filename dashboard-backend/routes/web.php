<?php

// Dans routes/web.php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TraitesController;
use App\Http\Controllers\TiersController;
use App\Http\Controllers\BrowsershotController;

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

// Impression client: aperçu imprimable
Route::get('/print/clients/{tier}/preview', [TiersController::class, 'preview'])
    ->name('clients.preview');

// Télécharger le PDF de l'aperçu (multi-pages)
Route::get('/print/traites/{traite}/preview.pdf', [TraitesController::class, 'previewPdf'])
    ->name('traites.preview_pdf');

// Capture d'impression (navigateur headless) sans interaction utilisateur
Route::get('/print/traites/{traite}/capture.pdf', [TraitesController::class, 'previewPdfCapture'])
    ->name('traites.preview_capture_pdf');

// (retiré) print-capture: retour à preview.pdf

// (supprimé) route print-capture: retour au flux précédent


// Envoi par email du PDF d'aperçu
Route::post('/print/traites/{traite}/email', [TraitesController::class, 'emailPreview'])
    ->name('traites.email');

// Envoi par email d'une image (PNG) capturée de l'aperçu
Route::post('/print/traites/{traite}/email-image', [TraitesController::class, 'emailPreviewImage'])
    ->name('traites.email_image');

// Télécharger la capture PNG de la traite (pleine page)
Route::get('/print/traites/{traite}/screenshot.png', [BrowsershotController::class, 'screenshotForTraite'])
    ->name('traites.screenshot');

// Télécharger la capture convertie en PDF
Route::get('/print/traites/{traite}/screenshot.pdf', [BrowsershotController::class, 'screenshotPdfForTraite'])
    ->name('traites.screenshot_pdf');

// Route de diagnostic pour tester Browsershot
Route::get('/test/browsershot', function() {
    try {
        if (!class_exists(\Spatie\Browsershot\Browsershot::class)) {
            return response()->json(['error' => 'Browsershot non installé'], 500);
        }

        $nodeBinary = env('NODE_BINARY', 'C:\\Program Files\\nodejs\\node.exe');
        $npmBinary = env('NPM_BINARY', 'C:\\Program Files\\nodejs\\npm.cmd');
        $chromiumPath = env('CHROMIUM_PATH');

        $shot = \Spatie\Browsershot\Browsershot::html('<html><body><h1>Test Browsershot</h1><p>Si vous voyez ceci, Browsershot fonctionne!</p></body></html>')
            ->windowSize(800, 600)
            ->deviceScaleFactor(1)
            ->timeout(30)
            ->setDelay(100)
            ->setOption('args', ['--no-sandbox', '--disable-setuid-sandbox'])
            ->setNodeBinary($nodeBinary)
            ->setNpmBinary($npmBinary);
        
        if ($chromiumPath) {
            $shot->setChromiumPath($chromiumPath);
        }
        
        $base64 = $shot->base64Screenshot();
        $imageData = base64_decode($base64);
        
        return response($imageData, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline; filename="test-browsershot.png"'
        ]);
        
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'node_binary' => env('NODE_BINARY', 'C:\\Program Files\\nodejs\\node.exe'),
            'npm_binary' => env('NPM_BINARY', 'C:\\Program Files\\nodejs\\npm.cmd'),
            'chromium_path' => env('CHROMIUM_PATH'),
        ], 500);
    }
});

