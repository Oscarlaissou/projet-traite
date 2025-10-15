<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Aperçu – Traites</title>
  <style>
    body { background: #f3f4f6; margin: 0; font-family: Arial, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 100; background: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 8px 12px; display: flex; gap: 8px; align-items: center; }
    .toolbar button { background: #111827; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
    .toolbar .hint { color: #4b5563; font-size: 12px; }
    .preview-wrapper { padding: 12px; display: grid; grid-template-columns: 1fr; gap: 20px; }
    .page { background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04); }
    @media print { .toolbar { display: none; } body { background: #fff; } .page { box-shadow: none; break-after: page; } }
    /* Reuse the inner container styles of print view */
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Imprimer</button>
    <span class="hint">Aperçu de toutes les traites. Cliquez sur Imprimer pour lancer l'impression.</span>
  </div>
  <div class="preview-wrapper">
    @foreach ($pages as $p)
      <div class="page">
        @php
          // Render the same partial content as the print template using variables
        @endphp
        <?php echo view('traites.print', $p)->render(); ?>
      </div>
    @endforeach
  </div>
</body>
</html>

