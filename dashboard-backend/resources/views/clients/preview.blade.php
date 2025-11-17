<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Aperçu – Demande client</title>
  <meta name="csrf-token" content="{{ csrf_token() }}" />
  <style>
    body {
      background: #f3f4f6;
      margin: 0;
      font-family: Arial, sans-serif;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    .preview-layout {
      padding: 32px;
      box-sizing: border-box;
      min-height: 100vh;
    }

    .page-wrapper {
      position: relative;
      /* background: #fff;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
      border-radius: 16px; */
      padding: 60px 220px;
      max-width: 1200px;
      margin: auto;
      min-height: 340mm;
      box-sizing: border-box;
      padding-right: 700px;
    }

    .header-sidebar {
      position: fixed;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      z-index: 10;
    }

    /* === LOGO + TEXTE À GAUCHE === */
    .header-left-fixed {
      left: 40px;
      width: 160px;
      text-align: center;
      padding-left: 50px;
    }

    .header-logo {
      max-width: 150px;
      height: auto;
    }

    .header-title h2 {
      margin: 0;
      font-size: 1.25em;
      color: #1f2937;
      font-weight: 600;
    }

    .header-title p {
      margin: 4px 0 0;
      font-size: 0.85em;
      color: #6b7280;
      line-height: 1.3;
    }

    /* === BOUTONS À DROITE, MÊME NIVEAU === */
    .header-right-fixed {
      right: 0px;
      width: auto;
      padding-left: 50px;
    }

    .toolbar {
      display: flex;
      flex-direction: row; /* MODIFIÉ ICI : les boutons sont en ligne par défaut */
      gap: 10px;
      width: 100%;
    }

    .toolbar button {
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
      font-size: 0.9em;
      white-space: nowrap;
    }

    .toolbar .secondary {
      background: #fff;
      color: #1f2937;
      border: 1px solid #d1d5db;
    }

    .toolbar .secondary:hover {
      background: #f3f4f6;
    }

    .toolbar .primary {
      background: #111827;
      color: #fff;
    }

    .toolbar .primary:hover {
      background: #1f2937;
    }

    .page-content {
      width: 100%;
      min-height: 600px;
      padding-top: 40px; /* Ajout d'un peu d'espace en haut pour compenser la barre retirée */
    }

    /* === Responsive : Mobile === */
    @media (max-width: 768px) {
      .preview-layout {
        padding: 16px;
      }

      .page-wrapper {
        padding: 20px;
        min-height: auto;
      }
      
      .header-sidebar {
        position: static;
        transform: none;
        width: 100%;
        margin: 0 auto 20px;
      }
      
      .header-right-fixed {
          margin-bottom: 30px;
      }

      .header-left-fixed,
      .header-right-fixed {
        left: auto !important;
        right: auto !important;
      }

      .toolbar {
        /* La direction est déjà "row", on a juste besoin de centrer */
        justify-content: center;
      }

      .page-content {
        min-height: auto;
        padding-top: 0;
      }
    }

    /* === Impression : Masquer les barres latérales === */
    @media print {
      body {
        background: #fff;
      }
      
      .header-sidebar { /* La barre de séparation a été retirée du sélecteur */
        display: none !important;
      }

      .preview-layout {
        padding: 0;
      }

      .page-wrapper {
        box-shadow: none;
        border-radius: 0;
        padding: 0;
        margin: 0;
        max-width: 100%;
        min-height: auto;
      }
      
      .page-content {
          padding-top: 0;
      }

      @page {
        margin: 15mm;
      }
    }
</style>
</head>
<body>

  <!-- LOGO + TEXTE À GAUCHE (HORS DE LA ZONE D'IMPRESSION) -->
  <div class="header-sidebar header-left-fixed">
    <img src="{{ asset('LOGO.png') }}" alt="CFAO Mobility" class="header-logo">
    <div class="header-title">
      <h2>Aperçu du document</h2>
      <p>Veuillez vérifier avant d'imprimer.</p>
    </div>
  </div>

  <!-- BOUTONS À DROITE (HORS DE LA ZONE D'IMPRESSION) -->
  <div class="header-sidebar header-right-fixed">
    <div class="toolbar">
      <button class="secondary" onclick="cancelPreview()">Fermer</button>
      <button class="primary" onclick="window.print()">Imprimer</button>
    </div>
  </div>

  <!-- ZONE D'IMPRESSION -->
  <div class="preview-layout">
    <div class="page-wrapper">
      <div class="page">
        
        <!-- Contenu principal -->
        <div class="page-content">
          <?php echo view('clients.print', $pages[0] ?? [])->render(); ?>
        </div>

      </div>
    </div>
  </div>

  <script>
    function cancelPreview() {
      window.close();
      setTimeout(function() {
        if (!document.hidden) {
          if (document.referrer) {
            window.location.href = document.referrer;
          } else if (history.length > 1) {
            history.back();
          } else {
            window.location.href = '/';
          }
        }
      }, 100);
    }
  </script>
</body>
</html>