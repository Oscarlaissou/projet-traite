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
            // Comptes sur la date d'émission (fallback sur created_at si null)
            $perDay = Traite::query()
                ->whereDate(DB::raw('COALESCE(date_emission, created_at)'), $today)
                ->count();
            $perMonth = Traite::query()
                ->whereBetween(DB::raw('COALESCE(date_emission, created_at)'), [$monthStart, $today])
                ->count();

            // Échues basées sur le statut explicitement marqué "Échu"
            $overdue = Traite::query()
                ->whereIn(DB::raw('LOWER(COALESCE(statut, ""))'), ['échu','echu'])
                ->count();

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
                ->selectRaw("DATE_FORMAT(COALESCE(date_emission, created_at), '%Y-%m') as ym, COUNT(*) as total")
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
            // Compter réellement par valeur de statut en base, puis normaliser les libellés/couleurs
            $rows = Traite::query()
                ->selectRaw('LOWER(TRIM(COALESCE(statut, ""))) as s, COUNT(*) as c')
                ->groupBy('s')
                ->get();

            $map = function(string $s): array {
                $s = strtolower($s);
                if (in_array($s, ['payé','payee','payée','paye'])) return ['Payé', '#10b981'];
                if (in_array($s, ['rejeté','rejete','rejetee','rejetée'])) return ['Rejeté', '#8b5cf6'];
                if (in_array($s, ['impayé','impaye'])) return ['Impayé', '#ef4444'];
                if (in_array($s, ['échu','echu'])) return ['Échu', '#f59e0b'];
                if (in_array($s, ['non échu','non echu','non-échu','non-echu'])) return ['Non échu', '#3b82f6'];
                return ['Autres', '#94a3b8'];
            };

            $agg = [];
            foreach ($rows as $r) {
                [$label, $color] = $map((string) $r->s);
                if (!isset($agg[$label])) $agg[$label] = ['name' => $label, 'value' => 0, 'color' => $color];
                $agg[$label]['value'] += (int) $r->c;
            }

            // Garantir la présence de toutes les catégories métier, même à 0
            $defaults = [
                'Non échu' => '#3b82f6',
                'Échu' => '#f59e0b',
                'Impayé' => '#ef4444',
                'Rejeté' => '#8b5cf6',
                'Payé' => '#10b981',
            ];
            foreach ($defaults as $label => $color) {
                if (!isset($agg[$label])) {
                    $agg[$label] = ['name' => $label, 'value' => 0, 'color' => $color];
                }
            }

            // Ordonner selon logique métier
            $order = ['Non échu','Échu','Impayé','Rejeté','Payé','Autres'];
            usort($agg, function($a, $b) use ($order) {
                return array_search($a['name'], $order) <=> array_search($b['name'], $order);
            });

            return response()->json(array_values($agg));
        } catch (\Throwable $e) {
            return response()->json([], 200);
        }
    }
}


