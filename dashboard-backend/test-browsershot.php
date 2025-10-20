<?php

// Script de test pour vérifier la configuration Browsershot
// À exécuter depuis la racine du projet Laravel

require_once 'vendor/autoload.php';

echo "=== Test de configuration Browsershot ===\n\n";

// Vérification de l'installation de Browsershot
if (class_exists(\Spatie\Browsershot\Browsershot::class)) {
    echo "✅ Browsershot est installé\n";
} else {
    echo "❌ Browsershot n'est pas installé\n";
    echo "Installez avec: composer require spatie/browsershot\n";
    exit(1);
}

// Vérification des binaires
$nodeBinary = env('NODE_BINARY', 'C:\\Program Files\\nodejs\\node.exe');
$npmBinary = env('NPM_BINARY', 'C:\\Program Files\\nodejs\\npm.cmd');
$chromiumPath = env('CHROMIUM_PATH');

echo "\n=== Vérification des binaires ===\n";
echo "Node.js: $nodeBinary\n";
if (file_exists($nodeBinary)) {
    echo "✅ Node.js trouvé\n";
    $version = shell_exec("$nodeBinary --version 2>&1");
    echo "Version: " . trim($version) . "\n";
} else {
    echo "❌ Node.js non trouvé\n";
}

echo "\nNPM: $npmBinary\n";
if (file_exists($npmBinary)) {
    echo "✅ NPM trouvé\n";
} else {
    echo "❌ NPM non trouvé\n";
}

if ($chromiumPath) {
    echo "\nChrome/Chromium: $chromiumPath\n";
    if (file_exists($chromiumPath)) {
        echo "✅ Chrome/Chromium trouvé\n";
    } else {
        echo "❌ Chrome/Chromium non trouvé\n";
    }
} else {
    echo "\nChrome/Chromium: Non configuré (Browsershot utilisera le Chrome système)\n";
}

// Test simple de capture
echo "\n=== Test de capture ===\n";
try {
    $shot = \Spatie\Browsershot\Browsershot::html('<html><body><h1>Test Browsershot</h1></body></html>')
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
    echo "✅ Capture réussie (taille: " . strlen(base64_decode($base64)) . " bytes)\n";
    
} catch (\Throwable $e) {
    echo "❌ Erreur de capture: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Recommandations ===\n";
echo "1. Assurez-vous que Node.js est installé et dans le PATH\n";
echo "2. Installez Chrome/Chromium ou configurez CHROMIUM_PATH\n";
echo "3. Vérifiez les permissions d'écriture dans le dossier de stockage\n";
echo "4. Pour Windows, assurez-vous que les chemins utilisent des doubles backslashes\n";

function env($key, $default = null) {
    $envFile = '.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                list($name, $value) = explode('=', $line, 2);
                if (trim($name) === $key) {
                    return trim($value);
                }
            }
        }
    }
    return $default;
}
