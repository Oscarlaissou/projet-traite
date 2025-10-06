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

        // Optionnel: filtres simples
        if ($s = $request->get('search')) {
            $query->where(function($q) use ($s) {
                $q->where('numero', 'like', "%$s%")
                  ->orWhere('nom_raison_sociale', 'like', "%$s%")
                  ->orWhere('motif', 'like', "%$s%");
            });
        }

        return response()->json($query->orderByDesc('id')->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);
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
            'numero' => ['required','string','max:100'],
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
}


