# Correction du problème de statut null lors de la modification

## Problème identifié
```
SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'statut' cannot be null
```

## Cause du problème
1. **Base de données** : La colonne `statut` est définie avec une valeur par défaut `'Non échu'` mais **sans** `nullable()`
2. **Validation** : Le champ `statut` était défini comme `nullable` dans la validation
3. **Frontend** : Envoyait parfois `statut: null` lors des modifications
4. **Laravel** : Tentait de mettre à jour avec `null`, violant la contrainte de la base de données

## Solutions implémentées

### 1. Correction dans le contrôleur (`TraitesController.php`)
```php
private function validateData(Request $request, $id = null): array
{
    $validated = $request->validate([
        // ... autres champs ...
        'statut' => ['nullable', Rule::in(['Non échu', 'Échu', 'Impayé', 'Rejeté', 'Payé'])],
    ]);
    
    // S'assurer que statut n'est jamais null (utiliser la valeur par défaut)
    if (is_null($validated['statut'])) {
        $validated['statut'] = 'Non échu';
    }
    
    return $validated;
}
```

### 2. Protection au niveau du modèle (`Traite.php`)
```php
protected static function boot()
{
    parent::boot();
    
    static::saving(function ($model) {
        if (is_null($model->statut)) {
            $model->statut = 'Non échu';
        }
    });
}
```

## Résultats des tests
- ✅ **Test 1** : Mise à jour avec `statut: null` → Utilise `'Non échu'`
- ✅ **Test 2** : Mise à jour avec `statut: 'Échu'` → Fonctionne correctement
- ✅ **Test 3** : Mise à jour avec `statut: null` à nouveau → Utilise `'Non échu'`

## Avantages de cette solution
1. **Double protection** : Contrôleur + Modèle
2. **Rétrocompatibilité** : N'affecte pas les données existantes
3. **Robustesse** : Gère tous les cas de figure
4. **Cohérence** : Utilise toujours la valeur par défaut appropriée

## Statuts valides
- `'Non échu'` (valeur par défaut)
- `'Échu'`
- `'Impayé'`
- `'Rejeté'`
- `'Payé'`

Le problème de modification des traites est maintenant résolu ! 🎉
