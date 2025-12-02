<?php

namespace App\Http\Controllers;

use App\Models\PendingClient;
use App\Models\Tier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PendingClientsController extends Controller
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
     * Store a newly created pending client in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            // Champs Tiers
            'numero_compte' => [
                'nullable',
                'string',
                'max:100',
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
            // Ajouter l'ID de l'utilisateur qui crée le client
            $validated['created_by'] = Auth::id();

            // Créer le client en attente
            $pendingClient = PendingClient::create($validated);

            return response()->json($pendingClient, 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'enregistrement.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display a listing of the pending clients.
     */
    public function index()
    {
        $pendingClients = PendingClient::with('createdBy:id,username')->get();
        
        // Log pour debugger les données
        \Log::info('Pending clients data:', ['count' => $pendingClients->count(), 'clients' => $pendingClients->toArray()]);
        
        return response()->json([
            'data' => $pendingClients,
            'count' => $pendingClients->count(),
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Display the specified pending client.
     */
    public function show(PendingClient $pendingClient)
    {
        $pendingClient->load('createdBy:id,username');
        
        // Log pour debugger les données
        \Log::info('Showing pending client:', ['client' => $pendingClient->toArray()]);
        
        return response()->json($pendingClient, 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Approve a pending client and move it to the tiers table.
     */
    public function approve(PendingClient $pendingClient)
    {
        try {
            // Utilisation d'une transaction pour garantir que les deux opérations réussissent ou échouent ensemble.
            $tier = DB::transaction(function () use ($pendingClient) {
                // 1. Préparer les données pour la création du Tiers.
                $tierData = [
                    'numero_compte' => $pendingClient->numero_compte,
                    'nom_raison_sociale' => $pendingClient->nom_raison_sociale,
                    'bp' => $pendingClient->bp,
                    'ville' => $pendingClient->ville,
                    'pays' => $pendingClient->pays,
                    'adresse_geo_1' => $pendingClient->adresse_geo_1,
                    'adresse_geo_2' => $pendingClient->adresse_geo_2,
                    'telephone' => $pendingClient->telephone,
                    'email' => $pendingClient->email,
                    'categorie' => $pendingClient->categorie,
                    'n_contribuable' => $pendingClient->n_contribuable,
                    'type_tiers' => $pendingClient->type_tiers,
                ];

                // Crée le nouveau Tiers en base de données.
                $newTier = Tier::create($tierData);

                // Si la table demande_ouverture_compte existe, créer également l'entrée
                if (DB::getSchemaBuilder()->hasTable('demande_ouverture_compte')) {
                    $demandeColumns = DB::getSchemaBuilder()->getColumnListing('demande_ouverture_compte');
                    
                    if (!empty($demandeColumns)) {
                        $demandeData = [
                            'id' => $newTier->id,
                            'date_creation' => $pendingClient->date_creation,
                            'montant_facture' => $pendingClient->montant_facture,
                            'montant_paye' => $pendingClient->montant_paye,
                            'credit' => $pendingClient->credit,
                            'motif' => $pendingClient->motif,
                            'etablissement' => $pendingClient->etablissement,
                            'service' => $pendingClient->service,
                            'nom_signataire' => $pendingClient->nom_signataire,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];

                        // Filtrer les colonnes qui existent dans la table
                        $filteredData = array_intersect_key($demandeData, array_flip($demandeColumns));
                        
                        if (!empty($filteredData)) {
                            DB::table('demande_ouverture_compte')->insert($filteredData);
                        }
                    }
                }

                // Supprimer le client en attente
                $pendingClient->delete();

                return $newTier;
            });

            // Si la transaction a réussi, renvoyer le Tiers avec un statut 201 Created.
            return response()->json($tier, 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            // Si une erreur survient (validation, contrainte BDD, etc.), la transaction est annulée.
            // On renvoie un message d'erreur clair au front-end.
            return response()->json([
                'message' => 'Une erreur est survenue lors de l\'approbation du client.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified pending client from storage.
     */
    public function destroy(PendingClient $pendingClient)
    {
        try {
            $pendingClient->delete();
            
            return response()->json([
                'message' => 'Client en attente supprimé avec succès.'
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la suppression du client en attente.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}