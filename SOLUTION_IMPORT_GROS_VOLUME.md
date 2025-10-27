# Test d'import de gros volume

## Problème identifié
L'importation était limitée à 11148 éléments à cause des limites PHP :
- `post_max_size = 8M` (limite des données POST)
- `upload_max_filesize = 2M` (limite d'upload)
- `memory_limit = 128M` (limite de mémoire)

## Solutions implémentées

### 1. Augmentation des limites PHP
- `memory_limit = 512M`
- `post_max_size = 100M`
- `upload_max_filesize = 50M`
- `max_input_vars = 10000`
- `max_execution_time = 300`

### 2. Système d'import par lots
- Traitement par lots de 1000 éléments
- Libération de mémoire après chaque lot
- Logs détaillés pour le monitoring
- Gestion d'erreurs améliorée

### 3. Optimisations backend
- Augmentation dynamique des limites dans le contrôleur
- Monitoring de l'utilisation mémoire
- Gestion des doublons optimisée
- Logs de progression par lot

## Instructions pour appliquer les changements

### Option 1 : Modifier php.ini
Ajouter les lignes suivantes dans le fichier `php.ini` :
```ini
memory_limit = 512M
post_max_size = 100M
upload_max_filesize = 50M
max_input_vars = 10000
max_execution_time = 300
```

### Option 2 : Utiliser .htaccess
Le fichier `.htaccess` a été créé avec les bonnes configurations.

### Option 3 : Configuration serveur
Pour Apache, ajouter dans la configuration :
```apache
php_value memory_limit 512M
php_value post_max_size 100M
php_value upload_max_filesize 50M
php_value max_input_vars 10000
php_value max_execution_time 300
```

## Test recommandé
1. Redémarrer le serveur web
2. Tester avec un fichier CSV de plus de 15000 lignes
3. Vérifier les logs pour s'assurer du bon fonctionnement

## Monitoring
Les logs incluent maintenant :
- Taille des données en MB
- Progression par lot
- Utilisation mémoire
- Temps de traitement
