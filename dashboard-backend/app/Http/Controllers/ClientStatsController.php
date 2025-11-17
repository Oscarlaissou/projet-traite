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

            $dateSource = $this->resolveDateSource();
            $creditSource = $this->resolveCreditSource();

            $total = Tier::query()->count();
            $perDay = $this->countForDate($dateSource, function ($builder, $column) use ($today) {
                return $builder->whereDate($column, $today)->count();
            });
            $perMonth = $this->countForDate($dateSource, function ($builder, $column) use ($monthStart, $today) {
                return $builder->whereBetween($column, [$monthStart, $today])->count();
            });

            $totalCredit = $creditSource
                ? (float) $this->baseBuilder($creditSource)->sum($creditSource['column'])
                : 0;

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
            $dateSource = $this->resolveDateSource();
            if (!$dateSource) {
                return response()->json([(int) date('Y')]);
            }

            $years = $this->baseBuilder($dateSource)
                ->selectRaw("DISTINCT YEAR({$dateSource['column']}) as year")
                ->whereNotNull($dateSource['column'])
                ->orderBy('year', 'desc')
                ->pluck('year')
                ->toArray();

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
            $dateSource = $this->resolveDateSource();
            if (!$dateSource) {
                return response()->json([], 200);
            }

            $year = (int) $request->get('year', date('Y'));
            
            $rows = $this->baseBuilder($dateSource)
                ->selectRaw("DATE_FORMAT({$dateSource['column']}, '%Y-%m') as ym, COUNT(*) as total")
                ->whereYear($dateSource['column'], $year)
                ->groupBy('ym')
                ->orderBy('ym')
                ->get();

            $months = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthKey = sprintf('%04d-%02d', $year, $i);
                $months[$monthKey] = 0;
            }
            
            foreach ($rows as $row) {
                $months[$row->ym] = (int) $row->total;
            }

            $data = array_map(function($ym, $total) {
                return ['name' => $ym, 'clients' => $total];
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
            $rows = Tier::query()
                ->selectRaw('COALESCE(type_tiers, "Non défini") as type, COUNT(*) as value')
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

    private function resolveDateSource(): ?array
    {
        if (Schema::hasColumn('tiers', 'created_at')) {
            return ['table' => 'tiers', 'column' => 'created_at'];
        }
        if (Schema::hasColumn('tiers', 'date_creation')) {
            return ['table' => 'tiers', 'column' => 'date_creation'];
        }
        if (Schema::hasTable('demande_ouverture_compte')) {
            if (Schema::hasColumn('demande_ouverture_compte', 'date_creation')) {
                return ['table' => 'demande_ouverture_compte', 'column' => 'date_creation'];
            }
            if (Schema::hasColumn('demande_ouverture_compte', 'created_at')) {
                return ['table' => 'demande_ouverture_compte', 'column' => 'created_at'];
            }
        }
        return null;
    }

    private function resolveCreditSource(): ?array
    {
        if (Schema::hasColumn('tiers', 'credit')) {
            return ['table' => 'tiers', 'column' => 'credit'];
        }
        if (Schema::hasTable('demande_ouverture_compte') && Schema::hasColumn('demande_ouverture_compte', 'credit')) {
            return ['table' => 'demande_ouverture_compte', 'column' => 'credit'];
        }
        return null;
    }

    private function baseBuilder(array $source)
    {
        return $source['table'] === 'tiers'
            ? Tier::query()
            : DB::table($source['table']);
    }

    private function countForDate(?array $source, callable $callback): int
    {
        if (!$source) {
            return 0;
        }
        $builder = $this->baseBuilder($source);
        return (int) $callback($builder, $source['column']);
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