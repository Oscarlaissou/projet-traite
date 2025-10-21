<?php

namespace App\Http\Controllers;

use App\Models\Traite;
use App\Models\TraiteActivity;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Barryvdh\DomPDF\Facade\Pdf;
// Browsershot (optionnel, pour rendu navigateur pixel-perfect)
// Installer le package spatie/browsershot pour activer cet import
// et avoir Node + Chrome/Chromium disponibles sur la machine
use Spatie\Browsershot\Browsershot;

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

        // Nouvelle plage sur la colonne 'echeance'
        $echeanceFrom = $request->get('echeance_from');
        $echeanceTo = $request->get('echeance_to');
        if ($echeanceFrom || $echeanceTo) {
            if ($echeanceFrom && $echeanceTo) {
                $fromTs = strtotime($echeanceFrom);
                $toTs = strtotime($echeanceTo);
                if ($fromTs !== false && $toTs !== false && $fromTs > $toTs) {
                    [$echeanceFrom, $echeanceTo] = [$echeanceTo, $echeanceFrom];
                }
            }
            $query->where(function($qq) use ($echeanceFrom, $echeanceTo) {
                if ($echeanceFrom) {
                    $qq->whereDate('echeance', '>=', $echeanceFrom);
                }
                if ($echeanceTo) {
                    $qq->whereDate('echeance', '<=', $echeanceTo);
                }
            });
        }

        // Raccourci: upcoming_days = N => statut=Non échu + echeance in [today, today + (N-1)]
        if ($request->has('upcoming_days')) {
            $n = (int) $request->get('upcoming_days');
            if ($n > 0) {
                $today = date('Y-m-d');
                $end = date('Y-m-d', strtotime("+$n days")); // exclusive upper bound alternative
                // Utiliser bornes inclusives J..J+(N-1)
                $inclusiveEnd = date('Y-m-d', strtotime("+".($n-1)." days"));
                $query->where('statut', 'Non échu')
                      ->whereDate('echeance', '>=', $today)
                      ->whereDate('echeance', '<=', $inclusiveEnd);
            }
        }

        // Tri: par défaut par nom A->Z si alpha, sinon par date d'émission décroissante (plus récent en premier);
        // personnalisable via query params
        $sort = $request->get('sort');
        $dir = strtolower($request->get('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSorts = ['echeance','date_emission','created_at','montant','numero','nom_raison_sociale','statut','id'];
        if (!in_array($sort, $allowedSorts, true)) {
            $sort = $request->has('alpha') ? 'nom_raison_sociale' : 'date_emission';
        }

        $perPage = (int) $request->get('per_page', 10);
        if ($perPage < 1 || $perPage > 200) { $perPage = 10; }
        return response()->json($query->orderBy($sort, $dir)->paginate($perPage));
    }

    /**
     * Render printable HTML for a specific traite and tranche index (1-based)
     */
    public function print(Traite $traite, ?int $index = 1)
    {
        $totalTranches = max(1, (int) ($traite->nombre_traites ?? 1));
        $currentIndex = min(max(1, (int) ($index ?? 1)), $totalTranches);

        // Base dates
        $emission = $traite->date_emission ? Carbon::parse($traite->date_emission) : null;
        $firstDue = $traite->echeance ? Carbon::parse($traite->echeance) : null;

        // Compute tranche due date: monthly increments from first échéance
        $dueDate = $firstDue ? $firstDue->copy()->addMonthsNoOverflow($currentIndex - 1) : null;

        // Amount per tranche using currency-friendly rounding and preserved total
        $total = (int) round($traite->montant ?? 0);
        $tranches = $this->splitAmountIntoTranches($total, $totalTranches);
        $amountForThisTranche = $tranches[$currentIndex - 1] ?? 0;

        // French number to words (basic, integers)
        $amountInWords = $this->numberToFrenchWords($amountForThisTranche);

        $data = [
            'rangeText' => $currentIndex . ' | ' . $totalTranches,
            'ville' => 'Douala',
            'date_emission' => $emission ? $emission->format('d/m/Y') : '',
            'echeance' => $dueDate ? $dueDate->format('d/m/Y') : '',
            'montant_tranche' => number_format($amountForThisTranche, 0, ',', ' '),
            'montant_tranche_words' => strtoupper($amountInWords),
            'nom_raison_sociale' => $traite->nom_raison_sociale ?? '',
            'domiciliation' => $traite->domiciliation_bancaire ?? '',
            'rib' => $traite->rib ?? '',
            'numero' => $traite->numero ?? '',
            'date_emission_text_long' => $emission ? $emission->locale('fr')->translatedFormat('d F Y') : '',
        ];

        return response()->view('traites.print', $data);
    }

    /**
     * Aperçu multi-pages pour toutes les traites (toutes tranches)
     */
    public function preview(Traite $traite)
    {
        $totalTranches = max(1, (int) ($traite->nombre_traites ?? 1));
        $emission = $traite->date_emission ? Carbon::parse($traite->date_emission) : null;
        $firstDue = $traite->echeance ? Carbon::parse($traite->echeance) : null;

        $total = (int) round($traite->montant ?? 0);
        $tranches = $this->splitAmountIntoTranches($total, $totalTranches);

        $pages = [];
        for ($i = 1; $i <= $totalTranches; $i++) {
            $dueDate = $firstDue ? $firstDue->copy()->addMonthsNoOverflow($i - 1) : null;
            $amountForThisTranche = $tranches[$i - 1] ?? 0;
            $pages[] = [
                'rangeText' => $i . ' | ' . $totalTranches,
                'ville' => 'Douala',
                'date_emission' => $emission ? $emission->format('d/m/Y') : '',
                'echeance' => $dueDate ? $dueDate->format('d/m/Y') : '',
                'montant_tranche' => number_format($amountForThisTranche, 0, ',', ' '),
                'montant_tranche_words' => strtoupper($this->numberToFrenchWords($amountForThisTranche)),
                'nom_raison_sociale' => $traite->nom_raison_sociale ?? '',
                'domiciliation' => $traite->domiciliation_bancaire ?? '',
                'rib' => $traite->rib ?? '',
                'numero' => $traite->numero ?? '',
                'date_emission_text_long' => $emission ? $emission->locale('fr')->translatedFormat('d F Y') : '',
            ];
        }

        return response()->view('traites.preview', [ 'pages' => $pages, 'traiteId' => $traite->id, 'traiteNumero' => $traite->numero ]);
    }

    /**
     * Retourne le PDF multi-pages (aperçu) en téléchargement
     */
    public function previewPdf(Traite $traite)
    {
        $totalTranches = max(1, (int) ($traite->nombre_traites ?? 1));
        $emission = $traite->date_emission ? Carbon::parse($traite->date_emission) : null;
        $firstDue = $traite->echeance ? Carbon::parse($traite->echeance) : null;
        $total = (int) round($traite->montant ?? 0);
        $tranches = $this->splitAmountIntoTranches($total, $totalTranches);

        // Construire un HTML "pur impression" en utilisant traites.print, sans toolbar/footer
        $htmlParts = [];
        for ($i = 1; $i <= $totalTranches; $i++) {
            $dueDate = $firstDue ? $firstDue->copy()->addMonthsNoOverflow($i - 1) : null;
            $amountForThisTranche = $tranches[$i - 1] ?? 0;
            $data = [
                'rangeText' => $i . ' | ' . $totalTranches,
                'ville' => 'Douala',
                'date_emission' => $emission ? $emission->format('d/m/Y') : '',
                'echeance' => $dueDate ? $dueDate->format('d/m/Y') : '',
                'montant_tranche' => number_format($amountForThisTranche, 0, ',', ' '),
                'montant_tranche_words' => strtoupper($this->numberToFrenchWords($amountForThisTranche)),
                'nom_raison_sociale' => $traite->nom_raison_sociale ?? '',
                'domiciliation' => $traite->domiciliation_bancaire ?? '',
                'rib' => $traite->rib ?? '',
                'numero' => $traite->numero ?? '',
                'date_emission_text_long' => $emission ? $emission->locale('fr')->translatedFormat('d F Y') : '',
            ];
            $htmlParts[] = view('traites.print', $data)->render();
            if ($i < $totalTranches) {
                $htmlParts[] = '<div style="page-break-after: always;"></div>';
            }
        }
        $html = implode("\n", $htmlParts);
        $pdf = Pdf::loadHTML($html)->setPaper('a4');
        return $pdf->download('traites_'.$traite->id.'.pdf');
    }

    /**
     * Capture "impression" via navigateur (Browsershot) sans interaction utilisateur
     */
    public function previewPdfCapture(Traite $traite)
    {
        $totalTranches = max(1, (int) ($traite->nombre_traites ?? 1));
        $emission = $traite->date_emission ? Carbon::parse($traite->date_emission) : null;
        $firstDue = $traite->echeance ? Carbon::parse($traite->echeance) : null;
        $total = (int) round($traite->montant ?? 0);
        $tranches = $this->splitAmountIntoTranches($total, $totalTranches);

        $htmlParts = [];
        for ($i = 1; $i <= $totalTranches; $i++) {
            $dueDate = $firstDue ? $firstDue->copy()->addMonthsNoOverflow($i - 1) : null;
            $amountForThisTranche = $tranches[$i - 1] ?? 0;
            $data = [
                'rangeText' => $i . ' | ' . $totalTranches,
                'ville' => 'Douala',
                'date_emission' => $emission ? $emission->format('d/m/Y') : '',
                'echeance' => $dueDate ? $dueDate->format('d/m/Y') : '',
                'montant_tranche' => number_format($amountForThisTranche, 0, ',', ' '),
                'montant_tranche_words' => strtoupper($this->numberToFrenchWords($amountForThisTranche)),
                'nom_raison_sociale' => $traite->nom_raison_sociale ?? '',
                'domiciliation' => $traite->domiciliation_bancaire ?? '',
                'rib' => $traite->rib ?? '',
                'numero' => $traite->numero ?? '',
                'date_emission_text_long' => $emission ? $emission->locale('fr')->translatedFormat('d F Y') : '',
            ];
            $htmlParts[] = view('traites.print', $data)->render();
            if ($i < $totalTranches) {
                $htmlParts[] = '<div style="page-break-after: always;"></div>';
            }
        }
        $html = implode("\n", $htmlParts);

        // Utilise Browsershot uniquement (rendu print CSS). Si indisponible, renvoie une erreur explicite.
        if (class_exists(\Spatie\Browsershot\Browsershot::class)) {
            try {
                $previewUrl = route('traites.preview', ['traite' => $traite->id]);
                $binary = Browsershot::url($previewUrl)
                    ->emulateMedia('print')
                    ->showBackground()
                    ->format('A4')
                    ->margins(5, 5, 5, 5)
                    ->windowSize(1024, 1448)
                    ->timeout(120)
                    ->setOption('waitUntil', 'networkidle0')
                    ->setOption('preferCSSPageSize', true)
                    ->pdf();
                return response($binary, 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="traites_'.$traite->id.'.pdf"',
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'La génération PDF de capture requiert Browsershot/Chrome headless.',
                ], 500);
            }
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Browsershot non installé. Installez spatie/browsershot + Chrome/Chromium.',
        ], 500);
    }

    /**
     * Envoie un PDF multi-pages par email en pièce jointe avec objet "Traites"
     */
    public function emailPreview(Request $request, Traite $traite)
    {
        $validated = $request->validate([
            'to' => ['required','email'],
            'subject' => ['nullable','string','max:255'],
            'body' => ['nullable','string','max:5000'],
        ]);

        $totalTranches = max(1, (int) ($traite->nombre_traites ?? 1));
        $emission = $traite->date_emission ? Carbon::parse($traite->date_emission) : null;
        $firstDue = $traite->echeance ? Carbon::parse($traite->echeance) : null;
        $total = (int) round($traite->montant ?? 0);
        $tranches = $this->splitAmountIntoTranches($total, $totalTranches);

        // Construire un HTML à partir de la vue print.blade.php pour chaque tranche
        $htmlParts = [];
        for ($i = 1; $i <= $totalTranches; $i++) {
            $dueDate = $firstDue ? $firstDue->copy()->addMonthsNoOverflow($i - 1) : null;
            $amountForThisTranche = $tranches[$i - 1] ?? 0;
            $amountWords = strtoupper($this->numberToFrenchWords($amountForThisTranche));
            $data = [
                'rangeText' => $i . ' | ' . $totalTranches,
                'ville' => 'Douala',
                'date_emission' => $emission ? $emission->format('d/m/Y') : '',
                'echeance' => $dueDate ? $dueDate->format('d/m/Y') : '',
                'montant_tranche' => number_format($amountForThisTranche, 0, ',', ' '),
                'montant_tranche_words' => $amountWords,
                'nom_raison_sociale' => $traite->nom_raison_sociale ?? '',
                'domiciliation' => $traite->domiciliation_bancaire ?? '',
                'rib' => $traite->rib ?? '',
                'numero' => $traite->numero ?? '',
                'date_emission_text_long' => $emission ? $emission->locale('fr')->translatedFormat('d F Y') : '',
            ];
            $htmlParts[] = view('traites.print', $data)->render();
            // Ajoute une rupture de page entre les tranches (sauf la dernière)
            if ($i < $totalTranches) {
                $htmlParts[] = '<div style="page-break-after: always;"></div>';
            }
        }
        $html = implode("\n", $htmlParts);

        // Générer une capture PNG via BrowsershotController (obligatoire)
        $pngBinary = null;
        try {
            if (!class_exists(\Spatie\Browsershot\Browsershot::class)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Browsershot requis: installez spatie/browsershot + Puppeteer/Chromium.'
                ], 500);
            }
            $controller = app(\App\Http\Controllers\BrowsershotController::class);
            $response = $controller->screenshotForTraite($traite);
            if (!($response->status() === 200 && str_contains($response->headers->get('Content-Type', ''), 'image/png'))) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Echec capture PNG via Browsershot.'
                ], 500);
            }
            $pngBinary = $response->getContent();
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Echec capture PNG via Browsershot.',
                'error' => $e->getMessage(),
            ], 500);
        }

        $to = $validated['to'];
        $subject = 'Traites';
        $numero = (string)($traite->numero ?? '');
        $body = "Bonjour,\n\nVeuillez trouver ci-joint la traite " . $numero . ".\n\nCordialement.";

        Mail::raw($body, function ($message) use ($to, $subject, $pngBinary, $traite) {
            $message->to($to)
                    ->subject($subject);
            $message->attachData($pngBinary, 'traites_'.$traite->id.'.png', ['mime' => 'image/png']);
        });

        return response()->json(['status' => 'ok']);
    }

    /**
     * Envoie une capture d'image (PNG) de la page d'aperçu multi-pages
     */
    public function emailPreviewImage(Request $request, Traite $traite)
    {
        $validated = $request->validate([
            'to' => ['required','email'],
            'subject' => ['nullable','string','max:255'],
            'body' => ['nullable','string','max:5000'],
        ]);

        $to = $validated['to'];
        $subject = $validated['subject'] ?? 'Traites (image)';
        $numero = (string)($traite->numero ?? '');
        $body = $validated['body'] ?? ("Bonjour,\n\nVeuillez trouver ci-joint l'image de la traite " . $numero . ".\n\nCordialement.");

        $imgBinary = null;
        try {
            if (class_exists(\Spatie\Browsershot\Browsershot::class)) {
                $previewUrl = route('traites.preview', ['traite' => $traite->id]);
                $base64 = Browsershot::url($previewUrl)
                    ->emulateMedia('print') // masque toolbar/footer
                    ->showBackground()
                    ->windowSize(1280, 2000)
                    ->fullPage()
                    ->timeout(120)
                    ->setOption('waitUntil', 'networkidle0')
                    ->base64Screenshot();
                $imgBinary = base64_decode($base64);
            }
        } catch (\Throwable $e) {
            $imgBinary = null;
        }

        if ($imgBinary === null) {
            return response()->json([
                'status' => 'error',
                'message' => "La capture d'image requiert Browsershot/Puppeteer installé."
            ], 500);
        }

        Mail::raw($body, function ($message) use ($to, $subject, $imgBinary, $traite) {
            $message->to($to)
                    ->subject($subject)
                    ->attachData($imgBinary, 'traites_'.$traite->id.'.png', ['mime' => 'image/png']);
        });

        return response()->json(['status' => 'ok']);
    }

    private function numberToFrenchWords(int $number): string
    {
        if ($number === 0) return 'zéro';
        $units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
        $tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
        $words = [];

        $appendBelowHundred = function(int $n) use (&$words, $units, $tens, &$appendBelowHundred) {
            if ($n <= 16) { $words[] = $units[$n]; return; }
            if ($n < 20) { $words[] = 'dix-' . $units[$n - 10]; return; }
            if ($n < 70) {
                $t = intdiv($n, 10);
                $u = $n % 10;
                if ($u === 1) $words[] = $tens[$t] . ' et un';
                else if ($u > 0) $words[] = $tens[$t] . '-' . $units[$u];
                else $words[] = $tens[$t];
                return;
            }
            if ($n < 80) { // 70-79: soixante + 10-19
                $rest = $n - 60;
                if ($rest === 11) $words[] = 'soixante et onze';
                else {
                    $words[] = 'soixante';
                    $appendBelowHundred($rest);
                }
                return;
            }
            // 80-99: quatre-vingt(s) + 0-19
            $rest = $n - 80;
            $words[] = 'quatre-vingt' . ($rest === 0 ? 's' : '');
            if ($rest > 0) $appendBelowHundred($rest);
        };

        $appendBelowThousand = function(int $n) use (&$words, $units, &$appendBelowHundred, &$appendBelowThousand) {
            if ($n >= 100) {
                $hundreds = intdiv($n, 100);
                $rest = $n % 100;
                if ($hundreds === 1) {
                    $words[] = 'cent' . ($rest === 0 ? 's' : '');
                } else {
                    $words[] = $units[$hundreds] . ' cent' . ($rest === 0 ? 's' : '');
                }
                if ($rest > 0) $appendBelowHundred($rest);
                return;
            }
            $appendBelowHundred($n);
        };

        $chunks = [1000000000 => 'milliard', 1000000 => 'million', 1000 => 'mille'];
        $n = $number;
        foreach ($chunks as $value => $label) {
            if ($n >= $value) {
                $q = intdiv($n, $value);
                $n %= $value;
                if ($value === 1000 && $q === 1) {
                    $words[] = 'mille';
                } else {
                    $segment = [];
                    $saveRef = &$words; $words = &$segment;
                    $appendBelowThousand($q);
                    $built = trim(preg_replace('/\s+/', ' ', implode(' ', $segment)));
                    $words = &$saveRef;
                    $words[] = $built . ' ' . ($q > 1 ? $label . 's' : $label);
                }
            }
        }
        if ($n > 0) $appendBelowThousand($n);

        return trim(preg_replace('/\s+/', ' ', implode(' ', $words)));
    }

    /**
     * Split a total amount into N tranches with friendly rounding while preserving the sum.
     * Strategy: choose a rounding step based on total magnitude (1,000,000; 1,000; or 1).
     * Then distribute remainder by adding one step to the first K tranches.
     */
    private function splitAmountIntoTranches(int $total, int $n): array
    {
        $n = max(1, $n);
        if ($total <= 0) return array_fill(0, $n, 0);

        // Choose rounding step
        $step = 1;
        if ($total >= 10000000) { // >= 10 millions
            $step = 1000000;      // arrondir au million
        } else if ($total >= 100000) { // >= 100 mille
            $step = 1000;         // arrondir au millier
        }

        // Equal share in steps, floored to step
        $equal = intdiv($total, $n);
        $equalRounded = intdiv($equal, $step) * $step;

        $parts = array_fill(0, $n, $equalRounded);
        $currentSum = $equalRounded * $n;
        $remaining = $total - $currentSum;

        // Convert remaining to steps and distribute to earliest tranches
        $stepsToDistribute = intdiv($remaining + ($step - 1), $step); // ceiling to steps
        for ($i = 0; $i < $n && $stepsToDistribute > 0; $i++) {
            $parts[$i] += $step;
            $stepsToDistribute--;
        }

        // Fix exact total if off due to ceiling
        $diff = array_sum($parts) - $total;
        for ($i = $n - 1; $i >= 0 && $diff > 0; $i--) {
            $reduce = min($diff, $step);
            $parts[$i] -= $reduce;
            $diff -= $reduce;
        }

        return $parts;
    }
    public function store(Request $request)
    {
        $data = $this->validateData($request);

        // Numérotation automatique si non fournie
        if (empty($data['numero'])) {
            $data['numero'] = $this->generateNumero();
        }

        $traite = Traite::create($data);

        // Log activity: Création
        try {
            TraiteActivity::create([
                'traite_id' => $traite->id,
                'user_id' => optional(Auth::user())->id,
                'action' => 'Création',
                'changes' => null,
            ]);
        } catch (\Throwable $e) {
            // ignore logging failures
        }

        return response()->json($traite, 201);
    }

    public function show(Traite $traite)
    {
        return response()->json($traite);
    }

    public function update(Request $request, Traite $traite)
    {
        $data = $this->validateData($request, $traite->id);

        $original = $traite->only(array_keys($data));
        $traite->update($data);
        $updated = $traite->only(array_keys($data));

        // Compute minimal diff
        $changes = [];
        foreach ($updated as $key => $val) {
            $before = $original[$key] ?? null;
            if ($before !== $val) {
                $changes[$key] = ['from' => $before, 'to' => $val];
            }
        }

        if (!empty($changes)) {
            try {
                TraiteActivity::create([
                    'traite_id' => $traite->id,
                    'user_id' => optional(Auth::user())->id,
                    'action' => 'Modification',
                    'changes' => $changes,
                ]);
            } catch (\Throwable $e) {
                // ignore logging failures
            }
        }

        return response()->json($traite);
    }

    public function destroy(Traite $traite)
    {
        $id = $traite->id;
        try {
            TraiteActivity::create([
                'traite_id' => $id,
                'user_id' => optional(Auth::user())->id,
                'action' => 'Suppression',
                'changes' => null,
            ]);
        } catch (\Throwable $e) {
            // ignore logging failures
        }

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

    public function historique(Request $request)
    {
        $type = $request->get('type'); // 'client' or 'mois'
        $nom = $request->get('nom_raison_sociale');
        $month = $request->get('month'); // YYYY-MM

        // Objectif: retourner TOUTES les traites, avec la dernière action et l'utilisateur s'ils existent
        $query = Traite::query()
            ->with(['latestActivity.user:id,username'])
            ->select(['id','numero','nom_raison_sociale','montant','statut','echeance','date_emission','created_at']);

        if ($type === 'client' && $nom) {
            $query->where('nom_raison_sociale', 'like', "%$nom%");
        }

        if ($type === 'mois' && $month && preg_match('/^\\d{4}-\\d{2}$/', $month)) {
            // Filtrer par mois sur la date d'émission (ou created_at si vous préférez)
            $parts = explode('-', $month);
            $yyyy = (int)($parts[0] ?? date('Y'));
            $mm = (int)($parts[1] ?? date('m'));
            $lastDay = cal_days_in_month(CAL_GREGORIAN, $mm, $yyyy);
            $start = sprintf('%04d-%02d-01', $yyyy, $mm);
            $end = sprintf('%04d-%02d-%02d', $yyyy, $mm, $lastDay);
            $query->whereBetween('date_emission', [$start, $end]);
        }

        $traites = $query->orderByDesc('date_emission')->limit(1000)->get();

        $mapped = $traites->map(function($t) {
            $act = $t->latestActivity;
            $action = $act?->action ?? 'Création';
            $user = $act?->user;
            $displayUser = $user?->username;
            // Choisir une date sûre: priorité à la date de l'activité, sinon date_emission, sinon echeance, sinon created_at de la traite
            $date = $act && $act->created_at ? $act->created_at->toDateTimeString() : (
                ($t->date_emission ?: ($t->echeance ?: ($t->created_at ?? '')))
            );
            return [
                'date' => (string)$date,
                'nom_raison_sociale' => $t->nom_raison_sociale,
                'numero_traite' => $t->numero,
                'montant' => $t->montant,
                'action' => $action,
                'statut' => $t->statut,
                'username' => $displayUser,
            ];
        })
        // trier par la date calculée décroissante (plus récent en premier)
        ->sortByDesc(function($row) {
            return $row['date'] ?? '';
        })
        ->values();

        return response()->json($mapped);
    }
}


