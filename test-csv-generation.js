// Test simple pour vérifier l'exportation CSV
// Ce script simule la génération CSV avec les données de l'API

const testData = {
  "id": 53,
  "numero": "TR-202510-000053",
  "nombre_traites": 1,
  "echeance": "2025-11-22",
  "date_emission": "2025-11-22",
  "montant": "7000000.00",
  "nom_raison_sociale": "CVB",
  "domiciliation_bancaire": "xcvbn",
  "rib": "125545379523",
  "motif": "azertyui",
  "commentaires": null,
  "statut": "Non échu"
};

const Columns = [
  { key: 'numero', label: 'Numéro' },
  { key: 'nombre_traites', label: 'Nb traites' },
  { key: 'echeance', label: 'Échéance' },
  { key: 'date_emission', label: 'Émission' },
  { key: 'montant', label: 'Montant de crédit' },
  { key: 'nom_raison_sociale', label: 'Nom/Raison sociale' },
  { key: 'domiciliation_bancaire', label: 'Domiciliation' },
  { key: 'rib', label: 'RIB' },
  { key: 'motif', label: 'Motif' },
  { key: 'commentaires', label: 'Commentaires' },
  { key: 'statut', label: 'Statut' },
];

console.log('Test de génération CSV:');
console.log('Données de test:', testData);

const headerKeys = Columns.map(c => c.key);
const headerLabels = Columns.map(c => c.label);

console.log('Clés des colonnes:', headerKeys);
console.log('Labels des colonnes:', headerLabels);

const row = headerKeys.map(k => {
  let v = testData[k];
  console.log(`Champ ${k}:`, v);
  
  if (k === 'echeance' || k === 'date_emission') {
    if (v) {
      const d = new Date(v);
      if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2,'0');
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const yyyy = d.getFullYear();
        v = `${dd}-${mm}-${yyyy}`;
      }
    }
  }
  if (k === 'montant') {
    v = Number(testData[k] || 0);
  }
  const s = v == null ? '' : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
}).join(',');

console.log('Ligne CSV générée:', row);

const csv = '\uFEFF' + [headerLabels.join(','), row].join('\n');
console.log('CSV complet:');
console.log(csv);
