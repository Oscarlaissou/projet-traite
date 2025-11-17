<?php

namespace App\Http\Controllers;

use App\Models\Tier;
use App\Models\TierActivity;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

/**
 * Contrôleur REST permettant d'exposer la grille des clients (tiers).
 */
class TiersController extends Controller
{
    /**
     * Liste des catégories supportées côté métier.
     */
    public const CATEGORIES = [
        'Sté Privées Hors Grp',
        'Société Groupe',
        'Individuel',
        'Personnel Groupe',
        'Administration',
        'Collectivité locale',
        'Entreprise Publique',
        'Administration Privée',
    ];

    /**
     * Tableau de correspondance entre les alias métier et les colonnes physiques éventuelles.
     *
     * @var array<string, array<int, string>>
     */
    private array $columnCandidates = [
        'nom_raison_sociale' => ['nom_raison_sociale', 'raison_sociale', 'nom', 'nom_tiers', 'nom_client'],
        'bp' => ['bp', 'boite_postale', 'boite_postale_1', 'boite_postale_client'],
        'ville' => ['ville', 'city', 'localite'],
        'pays' => ['pays', 'country', 'nation'],
        'categorie' => ['categorie', 'category', 'type_client', 'type'],
    ];

    /**
     * Colonnes effectivement présentes dans la table (déterminé dynamiquement).
     *
     * @var array<string, string>
     */
    private array $resolvedColumns = [];

    /**
     * Colonnes disponibles sur la table demande_ouverture_compte (si présente).
     *
     * @var array<int, string>
     */
    private array $demandeColumns = [];

    public function __construct()
    {
        $this->resolvedColumns = $this->resolveColumns();
        $this->demandeColumns = Schema::hasTable('demande_ouverture_compte')
            ? Schema::getColumnListing('demande_ouverture_compte')
            : [];
    }

    /**
     * Retourne la liste paginée des clients avec recherche, tri et filtrage.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tier::query();

        // Sélectionner les colonnes pertinentes uniquement pour optimiser la charge.
        $selectColumns = array_unique(array_merge(['id'], array_values($this->resolvedColumns)));
        $query->select($selectColumns);

        // Recherche full-text simple sur les colonnes principales.
        if ($search = trim((string) $request->get('search', ''))) {
            $query->where(function ($q) use ($search) {
                foreach ($this->resolvedColumns as $column) {
                    $q->orWhere($column, 'like', "%{$search}%");
                }
            });
        }

        // Filtrage par catégorie (supporte une ou plusieurs valeurs).
        $categoryFilter = $request->input('categorie');
        $categories = $this->normaliseCategoryFilter($categoryFilter);
        if (!empty($categories) && $resolvedCategoryColumn = ($this->resolvedColumns['categorie'] ?? null)) {
            $query->whereIn($resolvedCategoryColumn, $categories);
        }

        // Tri configurable sur un sous-ensemble de colonnes.
        $sortRequest = (string) $request->get('sort', 'nom_raison_sociale');
        $direction = strtolower((string) $request->get('dir', 'asc')) === 'desc' ? 'desc' : 'asc';

        $allowedSorts = [
            'nom_raison_sociale' => $this->resolvedColumns['nom_raison_sociale'] ?? 'nom_raison_sociale',
            'bp' => $this->resolvedColumns['bp'] ?? 'bp',
            'ville' => $this->resolvedColumns['ville'] ?? 'ville',
            'pays' => $this->resolvedColumns['pays'] ?? 'pays',
            'categorie' => $this->resolvedColumns['categorie'] ?? 'categorie',
        ];

        if (!array_key_exists($sortRequest, $allowedSorts)) {
            $sortRequest = 'nom_raison_sociale';
        }

        $query->orderBy($allowedSorts[$sortRequest], $direction);

        // Pagination paramétrable (borne haute pour éviter les abus).
        $perPage = max(1, min((int) $request->get('per_page', 10), 200));
        $results = $query->paginate($perPage);

        // Projection des colonnes physiques vers les alias attendus côté frontend.
        $collection = $results->getCollection()->map(function (Tier $tier) {
            return [
                'id' => $tier->getKey(),
                'nom_raison_sociale' => $this->extractValue($tier, 'nom_raison_sociale'),
                'bp' => $this->extractValue($tier, 'bp'),
                'ville' => $this->extractValue($tier, 'ville'),
                'pays' => $this->extractValue($tier, 'pays'),
                'categorie' => $this->extractValue($tier, 'categorie'),
            ];
        });

        $results->setCollection($collection);

        return response()->json([
            'data' => $results->items(),
            'current_page' => $results->currentPage(),
            'last_page' => $results->lastPage(),
            'per_page' => $results->perPage(),
            'total' => $results->total(),
            'available_categories' => self::CATEGORIES,
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Création d'un client (tier) et de sa demande d'ouverture de compte associée de manière transactionnelle.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Champs Tiers
            'numero_compte' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('tiers', 'numero_compte')
            ],
            'nom_raison_sociale' => ['required', 'string', 'max:255'],
            'bp' => ['nullable', 'string', 'max:255'],
            'ville' => ['nullable', 'string', 'max:255'],
            'pays' => ['nullable', 'string', 'max:255'],
            'adresse_geo_1' => ['nullable', 'string', 'max:255'],
            'adresse_geo_2' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'categorie' => ['required', 'string', Rule::in(self::CATEGORIES)],
            'n_contribuable' => ['nullable', 'string', 'max:100'],
            'type_tiers' => ['required', 'string', Rule::in(['Client', 'Fournisseur'])],

            // Champs Demande d'ouverture de compte
            'date_creation' => ['nullable', 'date'],
            'montant_facture' => ['nullable', 'numeric', 'min:0'],
            'montant_paye' => ['nullable', 'numeric', 'min:0'],
            'credit' => ['nullable', 'numeric'],
            'motif' => ['nullable', 'string', 'max:1000'],
            'etablissement' => ['nullable', 'string', 'max:255'],
            'service' => ['nullable', 'string', 'max:255'],
            'nom_signataire' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            // Utilisation d'une transaction pour garantir que les deux insertions réussissent ou échouent ensemble.
            $tier = DB::transaction(function () use ($validated) {
                // 1. Préparer les données pour la création du Tiers.
                $tierData = [
                    'numero_compte' => $validated['numero_compte'] ?? null,
                    'nom_raison_sociale' => $validated['nom_raison_sociale'],
                    'bp' => $validated['bp'] ?? null,
                    'ville' => $validated['ville'] ?? null,
                    'pays' => $validated['pays'] ?? null,
                    'adresse_geo_1' => $validated['adresse_geo_1'] ?? null,
                    'adresse_geo_2' => $validated['adresse_geo_2'] ?? null,
                    'telephone' => $validated['telephone'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'categorie' => $validated['categorie'],
                    'n_contribuable' => $validated['n_contribuable'] ?? null,
                    'type_tiers' => $validated['type_tiers'],
                ];
                
                // Crée le nouveau Tiers en base de données.
                $newTier = Tier::create($tierData);

                if (!empty($this->demandeColumns)) {
                    $demandeData = $this->buildDemandePayload($newTier->id, $validated, null, true);
                    if ($this->shouldPersistDemande($demandeData)) {
                        DB::table('demande_ouverture_compte')->insert($demandeData);
                    }
                }

                // Enregistrer l'activité de création
                try {
                    TierActivity::create([
                        'tier_id' => $newTier->id,
                        'user_id' => optional(Auth::user())->id,
                        'action' => 'Création',
                        'changes' => null,
                    ]);
                } catch (\Throwable $e) {
                    // ignore logging failures
                }

                return $newTier; // La transaction retourne le Tiers créé.
            });

            // Si la transaction a réussi, renvoyer le Tiers avec un statut 201 Created.
            return response()->json($tier, 201, [], JSON_UNESCAPED_UNICODE);

        } catch (\Throwable $e) {
            // Si une erreur survient (validation, contrainte BDD, etc.), la transaction est annulée.
            // On renvoie un message d'erreur clair au front-end.
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'enregistrement.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Résout dynamiquement la correspondance entre les alias et les colonnes disponibles.
     *
     * @return array<string, string>
     */
    private function resolveColumns(): array
    {
        $resolved = [];
        foreach ($this->columnCandidates as $alias => $candidates) {
            $found = Arr::first($candidates, fn (string $candidate) => Schema::hasColumn('tiers', $candidate));
            if ($found === null) {
                $found = $candidates[0]; //Fallback sur le premier candidat
            }
            $resolved[$alias] = $found;
        }
        return $resolved;
    }

    /**
     * Convertit la valeur du filtre catégorie en tableau exploitable.
     *
     * @param mixed $input
     * @return array<int, string>
     */
    private function normaliseCategoryFilter(mixed $input): array
    {
        if (is_array($input)) {
            $values = $input;
        } elseif (is_string($input) && strlen(trim($input)) > 0) {
            $values = preg_split('/[,;]/', $input);
        } else {
            return [];
        }

        $values = array_filter(array_map(fn ($value) => trim((string) $value), $values));
        return array_values($values);
    }

    /**
     * Récupère la valeur correspondant à l'alias fourni pour l'instance donnée.
     */
    private function extractValue(Tier $tier, string $alias): ?string
    {
        $column = $this->resolvedColumns[$alias] ?? null;
        if ($column === null) {
            return null;
        }
        $value = $tier->getAttribute($column);
        return $value === null ? null : (string) $value;
    }

    /**
     * Affiche le détail d'un client (tier).
     */
    public function show(Tier $tier): JsonResponse
    {
        // Récupère les informations de la demande d'ouverture de compte si elles existent
        $demande = DB::table('demande_ouverture_compte')->where('id', $tier->id)->first();

        $payload = $tier->toArray();

        if ($demande) {
            $payload['date_creation'] = $demande->date_creation ?? null;
            $payload['montant_facture'] = $demande->montant_facture ?? null;
            $payload['montant_paye'] = $demande->montant_paye ?? null;
            $payload['credit'] = $demande->credit ?? null;
            $payload['motif'] = $demande->motif ?? null;
            if (property_exists($demande, 'etablissement')) {
                $payload['etablissement'] = $demande->etablissement;
            }
            if (property_exists($demande, 'service')) {
                $payload['service'] = $demande->service;
            }
            if (property_exists($demande, 'nom_signataire')) {
                $payload['nom_signataire'] = $demande->nom_signataire;
            }
        }

        return response()->json($payload, 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Supprime un client (tier).
     */
    public function destroy(Tier $tier): JsonResponse
    {
        $tier->delete();
        return response()->json(['message' => 'Client supprimé'], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Met à jour un client (tier) et sa demande d'ouverture de compte associée si fournie.
     */
    public function update(Request $request, Tier $tier): JsonResponse
    {
        $validated = $request->validate([
            // Champs Tiers
            'numero_compte' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('tiers', 'numero_compte')->ignore($tier->id, 'id'),
            ],
            'nom_raison_sociale' => ['required', 'string', 'max:255'],
            'bp' => ['nullable', 'string', 'max:255'],
            'ville' => ['nullable', 'string', 'max:255'],
            'pays' => ['nullable', 'string', 'max:255'],
            'adresse_geo_1' => ['nullable', 'string', 'max:255'],
            'adresse_geo_2' => ['nullable', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'categorie' => ['required', 'string', Rule::in(self::CATEGORIES)],
            'n_contribuable' => ['nullable', 'string', 'max:100'],
            'type_tiers' => ['required', 'string', Rule::in(['Client', 'Fournisseur'])],

            // Champs Demande d'ouverture de compte
            'date_creation' => ['nullable', 'date'],
            'montant_facture' => ['nullable', 'numeric', 'min:0'],
            'montant_paye' => ['nullable', 'numeric', 'min:0'],
            'credit' => ['nullable', 'numeric'],
            'motif' => ['nullable', 'string', 'max:1000'],
            'etablissement' => ['nullable', 'string', 'max:255'],
            'service' => ['nullable', 'string', 'max:255'],
            'nom_signataire' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            DB::transaction(function () use ($validated, $tier) {
                // Capturer les valeurs avant modification (Tiers)
                $oldValues = $tier->only([
                    'numero_compte', 'nom_raison_sociale', 'bp', 'ville', 'pays',
                    'adresse_geo_1', 'adresse_geo_2', 'telephone', 'email',
                    'categorie', 'n_contribuable', 'type_tiers'
                ]);
                
                // Capturer aussi les valeurs de la demande avant modification
                $oldDemande = null;
                if (!empty($this->demandeColumns)) {
                    $oldDemande = DB::table('demande_ouverture_compte')->where('id', $tier->id)->first();
                }

                // Mise à jour des champs Tiers
                $tier->update([
                    'numero_compte' => $validated['numero_compte'] ?? null,
                    'nom_raison_sociale' => $validated['nom_raison_sociale'],
                    'bp' => $validated['bp'] ?? null,
                    'ville' => $validated['ville'] ?? null,
                    'pays' => $validated['pays'] ?? null,
                    'adresse_geo_1' => $validated['adresse_geo_1'] ?? null,
                    'adresse_geo_2' => $validated['adresse_geo_2'] ?? null,
                    'telephone' => $validated['telephone'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'categorie' => $validated['categorie'],
                    'n_contribuable' => $validated['n_contribuable'] ?? null,
                    'type_tiers' => $validated['type_tiers'],
                ]);

                // Détecter les changements sur Tiers
                $changes = [];
                foreach ($oldValues as $key => $oldValue) {
                    $newValue = $tier->{$key};
                    if ($oldValue != $newValue) {
                        $changes[$key] = ['old' => $oldValue, 'new' => $newValue];
                    }
                }

                // Mise à jour/Création de la demande d'ouverture si la table existe
                if (!empty($this->demandeColumns)) {
                    $demande = DB::table('demande_ouverture_compte')->where('id', $tier->id)->first();
                    $payload = $this->buildDemandePayload($tier->id, $validated, $demande, $demande === null);
                    if ($this->shouldPersistDemande($payload)) {
                        if ($demande) {
                            unset($payload['id']); // inutile pour update
                            DB::table('demande_ouverture_compte')->where('id', $tier->id)->update($payload);
                            
                            // Détecter les changements sur demande_ouverture_compte
                            $demandeFields = ['etablissement', 'service', 'nom_signataire', 'montant_facture', 'montant_paye', 'credit', 'motif'];
                            foreach ($demandeFields as $field) {
                                if ($this->hasDemandeColumn($field)) {
                                    $oldVal = $oldDemande->{$field} ?? null;
                                    $newVal = $payload[$field] ?? null;
                                    if ($oldVal != $newVal) {
                                        $changes[$field] = ['old' => $oldVal, 'new' => $newVal];
                                    }
                                }
                            }
                        } else {
                            DB::table('demande_ouverture_compte')->insert($payload);
                        }
                    }
                }

                // Enregistrer l'activité de modification si des changements ont été détectés
                if (!empty($changes)) {
                    TierActivity::create([
                        'tier_id' => $tier->id,
                        'user_id' => optional(Auth::user())->id,
                        'action' => 'Modification',
                        'changes' => $changes,
                    ]);
                }
            });

            return response()->json($tier->fresh(), 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la mise à jour.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Construit le payload pour la table demande_ouverture_compte.
     */
    private function buildDemandePayload(int $tierId, array $validated, ?object $existing = null, bool $isCreation = false): array
    {
        if (empty($this->demandeColumns)) {
            return [];
        }

        $payload = [];
        if ($isCreation && $this->hasDemandeColumn('id')) {
            $payload['id'] = $tierId;
        }

        $payload = $this->assignDemandeValue($payload, 'date_creation', $validated, $existing, $isCreation ? now() : null);
        $payload = $this->assignDemandeValue($payload, 'montant_facture', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'montant_paye', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'credit', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'motif', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'etablissement', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'service', $validated, $existing);
        $payload = $this->assignDemandeValue($payload, 'nom_signataire', $validated, $existing);

        if ($isCreation && $this->hasDemandeColumn('created_at')) {
            $payload['created_at'] = now();
        }
        if ($this->hasDemandeColumn('updated_at')) {
            $payload['updated_at'] = now();
        }

        $this->applyDemandeUser($payload);

        return $payload;
    }

    private function assignDemandeValue(array $payload, string $column, array $validated, ?object $existing, $default = null): array
    {
        if (!$this->hasDemandeColumn($column)) {
            return $payload;
        }

        if (array_key_exists($column, $validated)) {
            $payload[$column] = $validated[$column];
        } elseif ($existing && property_exists($existing, $column)) {
            $payload[$column] = $existing->{$column};
        } elseif ($default !== null) {
            $payload[$column] = $default;
        } else {
            $payload[$column] = null;
        }

        return $payload;
    }

    private function hasDemandeColumn(string $column): bool
    {
        return in_array($column, $this->demandeColumns, true);
    }

    private function applyDemandeUser(array &$payload): void
    {
        $user = Auth::user();
        if (!$user) {
            return;
        }

        $username = $user->username ?? $user->name ?? $user->email ?? 'Utilisateur';

        if ($this->hasDemandeColumn('user_id')) {
            $payload['user_id'] = $user->id;
        } elseif ($this->hasDemandeColumn('utilisateur_id')) {
            $payload['utilisateur_id'] = $user->id;
        } elseif ($this->hasDemandeColumn('utilisateur')) {
            $payload['utilisateur'] = $username;
        }
    }

    private function shouldPersistDemande(array $payload): bool
    {
        foreach ($payload as $key => $value) {
            if (in_array($key, ['id', 'created_at', 'updated_at', 'user_id', 'utilisateur_id', 'utilisateur'], true)) {
                continue;
            }
            if ($value !== null && $value !== '') {
                return true;
            }
        }
        return false;
    }

    /**
     * Retourne la liste des agences (Établissement / Service / Nom du signataire).
     */
    public function agences(): JsonResponse
    {
        if (!Schema::hasTable('agence')) {
            return response()->json([], 200, [], JSON_UNESCAPED_UNICODE);
        }

        $columns = Schema::getColumnListing('agence');
        $select = array_values(array_intersect($columns, ['id', 'code', 'etablissement', 'service', 'nom_signataire', 'societe']));
        if (empty($select)) {
            $select = ['id'];
        }

        $query = DB::table('agence')->select($select);
        if (in_array('etablissement', $select, true)) {
            $query->orderBy('etablissement');
        }

        $rows = $query->get();
        return response()->json($rows, 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Import CSV pour les clients.
     */
    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'duplicate_action' => ['nullable', Rule::in(['skip', 'update'])],
        ]);

        $file = $request->file('file');
        $contents = file_get_contents($file->getRealPath());
        if (!is_string($contents) || trim($contents) === '') {
            return response()->json(['message' => 'Fichier CSV vide.'], 422);
        }

        $delimiter = $this->detectDelimiter($contents);
        $lines = preg_split("/\r\n|\n|\r/", trim($contents));
        if (!$lines || count($lines) < 2) {
            return response()->json(['message' => 'Aucune donnée détectée dans le fichier.'], 422);
        }

        $headers = str_getcsv(array_shift($lines), $delimiter);
        $normalizedHeaders = array_map([$this, 'normalizeHeader'], $headers);
        if (!array_filter($normalizedHeaders)) {
            return response()->json(['message' => 'Impossible de déterminer les colonnes du fichier.'], 422);
        }

        $duplicateAction = $request->input('duplicate_action', 'update');
        $summary = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

        foreach ($lines as $index => $line) {
            if (trim($line) === '') {
                continue;
            }
            $values = str_getcsv($line, $delimiter);
            $row = [];
            foreach ($normalizedHeaders as $colIndex => $key) {
                if (!$key) {
                    continue;
                }
                $row[$key] = $values[$colIndex] ?? null;
            }
            if (!array_filter($row, fn ($value) => $value !== null && $value !== '')) {
                continue;
            }

            $normalized = $this->normalizeImportedRow($row);
            $validator = Validator::make($normalized, [
                'nom_raison_sociale' => ['required', 'string', 'max:255'],
                'numero_compte' => ['nullable', 'string', 'max:100'],
                'type_tiers' => ['nullable', Rule::in(['Client', 'Fournisseur'])],
            ]);

            if ($validator->fails()) {
                $summary['errors'][] = sprintf(
                    'Ligne %d: %s',
                    $index + 2,
                    implode(', ', $validator->errors()->all())
                );
                continue;
            }

            try {
                $result = $this->upsertTierFromImport($normalized, $duplicateAction);
                $summary[$result] = ($summary[$result] ?? 0) + 1;
            } catch (\Throwable $e) {
                $summary['errors'][] = sprintf('Ligne %d: %s', $index + 2, $e->getMessage());
            }
        }

        return response()->json($summary);
    }

    private function upsertTierFromImport(array $data, string $duplicateAction): string
    {
        $tier = null;
        if (!empty($data['numero_compte'])) {
            $tier = Tier::where('numero_compte', $data['numero_compte'])->first();
        }
        if (!$tier && !empty($data['nom_raison_sociale'])) {
            $tier = Tier::where('nom_raison_sociale', $data['nom_raison_sociale'])->first();
        }

        if ($tier && $duplicateAction === 'skip') {
            return 'skipped';
        }

        $tierPayload = [
            'numero_compte' => $data['numero_compte'] ?? null,
            'nom_raison_sociale' => $data['nom_raison_sociale'],
            'bp' => $data['bp'] ?? null,
            'ville' => $data['ville'] ?? null,
            'pays' => $data['pays'] ?? null,
            'adresse_geo_1' => $data['adresse_geo_1'] ?? null,
            'adresse_geo_2' => $data['adresse_geo_2'] ?? null,
            'telephone' => $data['telephone'] ?? null,
            'email' => $data['email'] ?? null,
            'categorie' => in_array($data['categorie'] ?? '', self::CATEGORIES, true) ? $data['categorie'] : self::CATEGORIES[0],
            'n_contribuable' => $data['n_contribuable'] ?? null,
            'type_tiers' => in_array($data['type_tiers'] ?? '', ['Client', 'Fournisseur'], true) ? $data['type_tiers'] : 'Client',
        ];

        if ($tier) {
            $tier->update($tierPayload);
            $this->persistDemandeFromImport($tier->id, $data, false);
            return 'updated';
        }

        $newTier = Tier::create($tierPayload);
        $this->persistDemandeFromImport($newTier->id, $data, true);
        return 'created';
    }

    private function persistDemandeFromImport(int $tierId, array $data, bool $isCreation): void
    {
        if (empty($this->demandeColumns)) {
            return;
        }

        $demande = DB::table('demande_ouverture_compte')->where('id', $tierId)->first();
        $payload = $this->buildDemandePayload($tierId, $data, $demande, $demande === null || $isCreation);

        if (!$this->shouldPersistDemande($payload)) {
            return;
        }

        if ($demande) {
            unset($payload['id']);
            DB::table('demande_ouverture_compte')->where('id', $tierId)->update($payload);
        } else {
            DB::table('demande_ouverture_compte')->insert($payload);
        }
    }

    private function normalizeImportedRow(array $row): array
    {
        $normalized = [];
        foreach ($row as $key => $value) {
            if (is_string($value)) {
                $value = trim($value);
            }
            $normalized[$key] = $value;
        }

        $normalized['date_creation'] = $this->parseDateValue($normalized['date_creation'] ?? null);
        $normalized['montant_facture'] = $this->parseNumeric($normalized['montant_facture'] ?? null);
        $normalized['montant_paye'] = $this->parseNumeric($normalized['montant_paye'] ?? null);
        $normalized['credit'] = $this->parseNumeric($normalized['credit'] ?? null);

        if (!empty($normalized['type_tiers'])) {
            $normalized['type_tiers'] = ucfirst(strtolower($normalized['type_tiers']));
        }

        return $normalized;
    }

    private function parseNumeric($value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        $clean = str_replace([' ', "\u{00A0}"], '', (string) $value);
        $clean = str_replace(',', '.', $clean);
        return is_numeric($clean) ? (float) $clean : null;
    }

    private function parseDateValue(?string $value): ?string
    {
        if (!$value) {
            return null;
        }
        $value = trim($value);
        $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'm/d/Y', 'd.m.Y'];
        foreach ($formats as $format) {
            try {
                $dt = Carbon::createFromFormat($format, $value);
                if ($dt !== false) {
                    return $dt->format('Y-m-d');
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function detectDelimiter(string $contents): string
    {
        $comma = substr_count($contents, ',');
        $semicolon = substr_count($contents, ';');
        return $semicolon > $comma ? ';' : ',';
    }

    private function normalizeHeader(?string $header): ?string
    {
        if ($header === null) {
            return null;
        }
        $normalized = strtolower(trim(Str::ascii($header)));
        return match ($normalized) {
            'nom', 'raison sociale', 'nom client', 'nom ou raison sociale', 'client' => 'nom_raison_sociale',
            'numero', 'numero compte', 'numero_compte' => 'numero_compte',
            'bp', 'boite postale' => 'bp',
            'ville' => 'ville',
            'pays' => 'pays',
            'adresse 1', 'adresse geo 1', 'adresse_geographique_1' => 'adresse_geo_1',
            'adresse 2', 'adresse geo 2', 'adresse_geographique_2' => 'adresse_geo_2',
            'telephone', 'tel' => 'telephone',
            'email', 'e-mail' => 'email',
            'categorie', 'catégorie', 'type client' => 'categorie',
            'n contribuable', 'numero contribuable' => 'n_contribuable',
            'type', 'type tiers', 'type_tiers' => 'type_tiers',
            'date creation', 'date_creation' => 'date_creation',
            'montant facture' => 'montant_facture',
            'montant paye', 'montant payé' => 'montant_paye',
            'credit', 'crédit' => 'credit',
            'motif' => 'motif',
            'etablissement' => 'etablissement',
            'service' => 'service',
            'nom signataire', 'nom du signataire' => 'nom_signataire',
            default => null,
        };
    }

    /**
     * Historique des clients - Fonctionne comme l'historique des traites.
     */
    public function historique(Request $request): JsonResponse
    {
        $type = $request->get('type'); // 'client' or 'mois'
        $nom = $request->get('nom_raison_sociale');
        $month = $request->get('month'); // YYYY-MM

        // Objectif: retourner TOUS les tiers, avec la dernière action et l'utilisateur s'ils existent
        $query = Tier::query()
            ->with(['latestActivity.user:id,username'])
            ->select(['id','numero_compte','nom_raison_sociale']);

        if ($type === 'client' && $nom) {
            $query->where('nom_raison_sociale', 'like', "%$nom%");
        }

        if ($type === 'mois' && $month && preg_match('/^\\d{4}-\\d{2}$/', $month)) {
            // Filtrer par mois en utilisant tier_activities
            $parts = explode('-', $month);
            $yyyy = (int)($parts[0] ?? date('Y'));
            $mm = (int)($parts[1] ?? date('m'));
            $lastDay = cal_days_in_month(CAL_GREGORIAN, $mm, $yyyy);
            $start = sprintf('%04d-%02d-01', $yyyy, $mm);
            $end = sprintf('%04d-%02d-%02d', $yyyy, $mm, $lastDay);
            
            // Filtrer par les tiers qui ont des activités dans ce mois
            $query->whereHas('activities', function($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end]);
            });
        }

        $tiers = $query->get();

        $mapped = $tiers->map(function($t) {
            // Récupérer la dernière activité et l'utilisateur associé
            $act = $t->latestActivity; // peut être null
            $action = $act?->action ?? 'Création';
            $user = $act?->user; // peut être null
            $displayUser = $user?->username ?? null;
            // La date est toujours celle de l'activité (obligatoire maintenant)
            $date = $act && $act->created_at ? $act->created_at->toDateTimeString() : now()->toDateTimeString();
            
            // Récupérer les changements s'il y en a
            $changes = $act?->changes ?? null;
            
            return [
                'date' => (string)$date,
                'nom_raison_sociale' => $t->nom_raison_sociale,
                'action' => $action,
                'username' => $displayUser,
                'changes' => $changes, // Ajout des changements
            ];
        })
        // trier par la date calculée décroissante (plus récent en premier)
        ->sortByDesc(function($row) {
            return $row['date'] ?? '';
        })
        ->values();

        return response()->json($mapped, 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function preview(Tier $tier)
    {
        $demande = DB::table('demande_ouverture_compte')->where('id', $tier->id)->first();
        $signatureDate = $demande && $demande->date_creation
            ? Carbon::parse($demande->date_creation)->format('d/m/Y')
            : Carbon::now()->format('d/m/Y');
        $pageData = [
            'tier' => $tier,
            'demande' => $demande,
            'signatureCity' => $tier->ville ?? 'DLA',
            'signatureDate' => $signatureDate,
            'purchaseTitle' => $demande->motif ?? '',
        ];

        return response()->view('clients.preview', [
            'pages' => [$pageData],
            'clientId' => $tier->id,
            'clientName' => $tier->nom_raison_sociale ?? '',
        ]);
    }
}