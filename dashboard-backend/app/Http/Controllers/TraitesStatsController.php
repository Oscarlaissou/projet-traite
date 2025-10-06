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

    public function monthly(Request $request)
    {
        try {
            // Retourne 12 mois glissants: [{ name: '2025-01', traites: 10 }, ...]
            $rows = Traite::query()
                ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as total")
                ->groupBy('ym')
                ->orderBy('ym')
                ->limit(12)
                ->get();

            $data = $rows->map(fn($r) => [
                'name' => $r->ym,
                'traites' => (int) $r->total,
            ]);

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([], 200);
        }
    }

    public function statusBreakdown(Request $request)
    {
        try {
            $today = Carbon::now()->toDateString();

            // Comptages par catégories métier demandées
            // Payé
            $paid = Traite::query()
                ->whereIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['payee','payée','paye','payé'])
                ->count();

            // Impayé
            $unpaid = Traite::query()
                ->whereIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['impaye','impayé'])
                ->count();

            // Rejeté (gérer variantes orthographiques)
            $rejected = Traite::query()
                ->whereIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['rejete','rejeté','rejetee','rejetée','regeté'])
                ->count();

            // Échu (non payé/non rejeté/non marqué impayé) et date_echeance < today
            $overdue = Traite::query()
                ->whereDate('date_echeance', '<', $today)
                ->whereNotIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['payee','payée','paye','payé','impaye','impayé','rejete','rejeté','rejetee','rejetée','regeté'])
                ->count();

            // Non échu (non payé/non rejeté/non impayé) et date_echeance >= today
            $notDue = Traite::query()
                ->whereDate('date_echeance', '>=', $today)
                ->whereNotIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['payee','payée','paye','payé','impaye','impayé','rejete','rejeté','rejetee','rejetée','regeté'])
                ->count();

            // Ordre et couleurs fixes
            $data = [
                [ 'name' => 'Non échu', 'value' => (int) $notDue, 'color' => '#3b82f6' ],
                [ 'name' => 'Échu', 'value' => (int) $overdue, 'color' => '#f59e0b' ],
                [ 'name' => 'Impayé', 'value' => (int) $unpaid, 'color' => '#ef4444' ],
                [ 'name' => 'Rejeté', 'value' => (int) $rejected, 'color' => '#8b5cf6' ],
                [ 'name' => 'Payé', 'value' => (int) $paid, 'color' => '#10b981' ],
            ];

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([], 200);
        }
    }
}


