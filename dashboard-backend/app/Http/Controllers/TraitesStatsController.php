<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Traite;
use Carbon\Carbon;

class TraitesStatsController extends Controller
{
    public function stats(Request $request)
    {
        try {
            // Vérifie la connexion et prépare les bornes de dates (si la table manque, on rattrape plus bas)
            $now = Carbon::now();
            $today = $now->toDateString();
            $monthStart = $now->copy()->startOfMonth()->toDateString();

            $total = Traite::query()->count();
            $perDay = Traite::query()
                ->whereDate('created_at', $today)
                ->count();
            $perMonth = Traite::query()
                ->whereBetween('created_at', [$monthStart, $today])
                ->count();

            // Échues : date_echeance < aujourd'hui ET (statut != 'payee/payée/payé/paye' OU statut NULL)
            $overdueQuery = Traite::query()
                ->whereDate('date_echeance', '<', $today);

            // Si une colonne "statut" existe, on tente d'exclure les traites payées
            try {
                $overdue = (clone $overdueQuery)
                    ->where(function ($q) {
                        $q->whereNull('statut')->orWhereNotIn('statut', ['payee', 'payée', 'paye', 'payé']);
                    })
                    ->count();
            } catch (\Throwable $e) {
                // Si la colonne "statut" n'existe pas, on compte uniquement sur la date d'échéance
                $overdue = (clone $overdueQuery)->count();
            }

            return response()->json([
                'total' => $total,
                'perDay' => $perDay,
                'perMonth' => $perMonth,
                'overdue' => $overdue,
            ]);
        } catch (\Throwable $e) {
            // Secours : renvoyer des zéros avec un message (ex. table manquante)
            return response()->json([
                'total' => 0,
                'perDay' => 0,
                'perMonth' => 0,
                'overdue' => 0,
                'error' => 'Unable to compute stats: ' . $e->getMessage(),
            ], 200);
        }
    }
}


