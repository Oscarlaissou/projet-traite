<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Tier;
use Carbon\Carbon;

class ClientStatsController extends Controller
{
    /**
     * Fournit les statistiques de base : total, nouveaux du jour, nouveaux du mois.
     */
    public function stats(Request $request)
    {
        try {
            $now = Carbon::now();
            $today = $now->toDateString();
            $monthStart = $now->copy()->startOfMonth()->toDateString();

            $total = Tier::query()->count();
            
            // Comptes sur la date de création de la table demande_ouverture_compte pour le jour en cours
            $perDay = DB::table('demande_ouverture_compte')
                ->whereDate('date_creation', $today)
                ->count();
                
            // Comptes sur la date de création de la table demande_ouverture_compte pour le mois en cours
            $perMonth = DB::table('demande_ouverture_compte')
                ->whereBetween('date_creation', [$monthStart, $now->toDateString()])
                ->count();

            // Vérifier si la colonne credit existe avant de l'utiliser
            $totalCredit = 0;
            if (Schema::hasColumn('tiers', 'credit')) {
                $totalCredit = (float) Tier::sum('credit');
            }

            return response()->json([
                'total' => $total,
                'perDay' => $perDay,
                'perMonth' => $perMonth,
                'totalCredit' => $totalCredit,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'total' => 0,
                'perDay' => 0,
                'perMonth' => 0,
                'totalCredit' => 0,
                'error' => 'Impossible de calculer les statistiques : ' . $e->getMessage(),
            ], 200);
        }
    }

    /**
     * Retourne les années disponibles pour le filtre du graphique.
     */
    public function availableYears(Request $request)
    {
        try {
            // Vérifier si la table existe
            if (!Schema::hasTable('demande_ouverture_compte')) {
                // Si la table n'existe pas, utiliser la table tiers
                $years = Tier::query()
                    ->selectRaw('DISTINCT YEAR(date_creation) as year')
                    ->whereNotNull('date_creation')
                    ->orderBy('year', 'desc')
                    ->pluck('year')
                    ->toArray();
            } else {
                $years = DB::table('demande_ouverture_compte')
                    ->selectRaw('DISTINCT YEAR(date_creation) as year')
                    ->whereNotNull('date_creation')
                    ->orderBy('year', 'desc')
                    ->pluck('year')
                    ->toArray();
            }

            $currentYear = (int) date('Y');
            if (!in_array($currentYear, $years)) {
                $years[] = $currentYear;
            }
            rsort($years);

            return response()->json($years);
        } catch (\Throwable $e) {
            return response()->json([(int) date('Y')]);
        }
    }

    /**
     * Fournit les données pour le graphique d'évolution mensuelle.
     */
    public function monthly(Request $request)
    {
        try {
            $year = (int) $request->get('year', date('Y'));
            
            // Vérifier si la table existe
            if (!Schema::hasTable('demande_ouverture_compte')) {
                // Si la table n'existe pas, utiliser la table tiers
                $rows = Tier::query()
                    ->selectRaw("DATE_FORMAT(date_creation, '%Y-%m') as ym, COUNT(*) as total")
                    ->whereYear('date_creation', $year)
                    ->groupBy('ym')
                    ->orderBy('ym')
                    ->get();
            } else {
                $rows = DB::table('demande_ouverture_compte')
                    ->selectRaw("DATE_FORMAT(date_creation, '%Y-%m') as ym, COUNT(*) as total")
                    ->whereYear('date_creation', $year)
                    ->groupBy('ym')
                    ->orderBy('ym')
                    ->get();
            }

            // Créer un tableau avec tous les mois de l'année (même ceux sans données)
            $months = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthKey = sprintf('%04d-%02d', $year, $i);
                $months[$monthKey] = 0;
            }
            
            // Remplir avec les données existantes
            foreach ($rows as $row) {
                $months[$row->ym] = (int) $row->total;
            }

            // Convertir en tableau de données pour le graphique
            $data = array_map(function($ym, $total) {
                return [
                    'name' => $ym,
                    'clients' => $total,
                ];
            }, array_keys($months), array_values($months));

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([], 200);
        }
    }

    /**
     * Fournit la répartition des tiers par type (Client, Client à terme, etc.).
     */
    public function typeBreakdown(Request $request)
    {
        try {
            $rows = Tier::selectRaw('COALESCE(type_tiers, "Non défini") as type, COUNT(*) as value')
                ->groupBy('type')
                ->get();

            $aggregated = [];
            foreach ($rows as $row) {
                $label = $this->normalizeType($row->type);
                if (!isset($aggregated[$label])) {
                    $aggregated[$label] = ['name' => $label, 'value' => 0];
                }
                $aggregated[$label]['value'] += (int) $row->value;
            }

            $colors = [
                'Client' => '#3b82f6',
                'Fournisseur' => '#f59e0b',
                'Non défini' => '#94a3b8',
            ];

            $data = array_values(array_map(function ($entry) use ($colors) {
                $entry['color'] = $colors[$entry['name']] ?? '#6b7280';
                return $entry;
            }, $aggregated));

            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json([], 200);
        }
    }

    private function normalizeType(?string $raw): string
    {
        $value = strtolower(trim((string) $raw));
        if (in_array($value, ['client', 'client à terme', 'client a terme'], true)) {
            return 'Client';
        }
        if ($value === 'fournisseur') {
            return 'Fournisseur';
        }
        return 'Non défini';
    }
}