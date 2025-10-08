<?php

namespace App\Http\Controllers;

use App\Models\Traite;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TraitesController extends Controller
{
    public function index(Request $request)
    {
        $query = Traite::query();

        // Recherche globale sur plusieurs colonnes
        if ($s = $request->get('search')) {
            $query->where(function($q) use ($s) {
                $q->where('numero', 'like', "%$s%")
                  ->orWhere('nom_raison_sociale', 'like', "%$s%")
                  ->orWhere('motif', 'like', "%$s%")
                  ->orWhere('domiciliation_bancaire', 'like', "%$s%")
                  ->orWhere('rib', 'like', "%$s%")
                  ->orWhere('commentaires', 'like', "%$s%")
                  ->orWhere('statut', 'like', "%$s%")
                  ->orWhereRaw('CAST(montant AS CHAR) like ?', ["%$s%"])
                  ->orWhereRaw('DATE_FORMAT(echeance, "%d-%m-%Y") like ?', ["%$s%"])
                  ->orWhereRaw('DATE_FORMAT(date_emission, "%d-%m-%Y") like ?', ["%$s%"]);
            });
        }

        // Filtre alphabétique par initiale de nom_raison_sociale
        if ($alpha = $request->get('alpha')) {
            $alpha = strtoupper(substr($alpha, 0, 1));
            if ($alpha === '#') {
                // Noms qui ne commencent pas par A-Z
                $query->where(function($q) {
                    $q->whereRaw("LEFT(UPPER(nom_raison_sociale), 1) < 'A'")
                      ->orWhereRaw("LEFT(UPPER(nom_raison_sociale), 1) > 'Z'");
                });
            } else if ($alpha >= 'A' && $alpha <= 'Z') {
                $query->whereRaw('LEFT(UPPER(nom_raison_sociale), 1) = ?', [$alpha]);
            }
        }

        // Filtres spécifiques: statut, plage d'échéance
        if ($statut = $request->get('statut')) {
            $query->where('statut', $statut);
        }
        $from = $request->get('from');
        $to = $request->get('to');
        if ($from || $to) {
            // Normaliser l'ordre des bornes si inversées
            if ($from && $to) {
                $fromTs = strtotime($from);
                $toTs = strtotime($to);
                if ($fromTs !== false && $toTs !== false && $fromTs > $toTs) {
                    [$from, $to] = [$to, $from];
                }
            }

            $query->where(function($qq) use ($from, $to) {
                if ($from) {
                    $qq->whereDate('date_emission', '>=', $from);
                }
                if ($to) {
                    $qq->whereDate('date_emission', '<=', $to);
                }
            });
        }

        // Tri: par défaut par nom A->Z si alpha, sinon par échéance croissante; personnalisable via query params
        $sort = $request->get('sort', 'echeance');
        $dir = strtolower($request->get('dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['echeance','date_emission','montant','numero','nom_raison_sociale','statut','id'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = $request->has('alpha') ? 'nom_raison_sociale' : 'echeance';
        }

        $perPage = (int) $request->get('per_page', 10);
        if ($perPage < 1 || $perPage > 100) { $perPage = 10; }
        return response()->json($query->orderBy($sort, $dir)->paginate($perPage));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        // Numérotation automatique si non fournie
        if (empty($data['numero'])) {
            $data['numero'] = $this->generateNumero();
        }

        $traite = Traite::create($data);
        return response()->json($traite, 201);
    }

    public function show(Traite $traite)
    {
        return response()->json($traite);
    }

    public function update(Request $request, Traite $traite)
    {
        $data = $this->validateData($request, $traite->id);
        $traite->update($data);
        return response()->json($traite);
    }

    public function destroy(Traite $traite)
    {
        $traite->delete();
        return response()->json(['deleted' => true]);
    }

    public function updateStatus(Request $request, Traite $traite)
    {
        $validated = $request->validate([
            'statut' => [
                'required',
                Rule::in(['Non échu', 'Échu', 'Impayé', 'Rejeté', 'Payé'])
            ]
        ]);
        $traite->update(['statut' => $validated['statut']]);
        return response()->json($traite);
    }

    private function validateData(Request $request, $id = null): array
    {
        return $request->validate([
            'numero' => ['nullable','string','max:100'],
            'nombre_traites' => ['required','integer','min:1'],
            'echeance' => ['required','date'],
            'date_emission' => ['required','date'],
            'montant' => ['required','numeric','min:0'],
            'nom_raison_sociale' => ['required','string','max:255'],
            'domiciliation_bancaire' => ['nullable','string','max:255'],
            'rib' => ['nullable','string','max:50'],
            'motif' => ['nullable','string','max:500'],
            'commentaires' => ['nullable','string','max:1000'],
            'statut' => ['nullable', Rule::in(['Non échu', 'Échu', 'Impayé', 'Rejeté', 'Payé'])],
        ]);
    }

    private function generateNumero(): string
    {
        // Format: TR-YYYYMM-###### basé sur le prochain ID
        $nextId = (int) (Traite::max('id') ?? 0) + 1;
        $prefix = 'TR-'.date('Ym').'-';
        return $prefix . str_pad((string)$nextId, 6, '0', STR_PAD_LEFT);
    }
}


