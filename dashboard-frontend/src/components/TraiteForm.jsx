import React, { useEffect, useRef, useState } from "react"
import { formatMoney } from "../utils/format"
import SuccessDialog from "./SuccessDialog"

const defaultForm = {
  numero: "",
  nombre_traites: 1,
  echeance: "",
  date_emission: "",
  montant: "",
  nom_raison_sociale: "",
  domiciliation_bancaire: "",
  rib: "",
  motif: "",
  commentaires: "",
  statut: "Non échu",
}

const TraiteForm = ({ initialValue, onCancel, onSaved, submitLabel }) => {
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successData, setSuccessData] = useState(null)
  // Conserver la valeur brute du montant et savoir si l'utilisateur l'a modifiée
  const [rawMontant, setRawMontant] = useState(null)
  const [montantTouched, setMontantTouched] = useState(false)

  useEffect(() => {
    if (initialValue) {
      // Format the initial montant value to remove decimals
      const formattedInitialValue = { ...initialValue };
      if (formattedInitialValue.montant) {
        // Convert to integer and format without decimals
        const montantInt = Math.floor(Number(formattedInitialValue.montant));
        formattedInitialValue.montant = montantInt.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
      }
      
      setForm({ ...defaultForm, ...formattedInitialValue });
      // Initialiser la valeur brute du montant à partir de la valeur initiale
      setRawMontant(typeof initialValue.montant === 'number' ? Math.floor(initialValue.montant) : Number(String(initialValue.montant || '').replace(/\D+/g, '')) || 0)
      setMontantTouched(false)
    }
  }, [initialValue])

  const montantRef = useRef(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'montant') {
      const inputEl = montantRef.current || e.target
      const selectionStart = inputEl.selectionStart ?? value.length
      const leftPart = value.slice(0, selectionStart)
      const leftDigitsCount = leftPart.replace(/\D+/g, '').length

      const digitsOnly = value.replace(/\D+/g, '')
      // Format without decimals - only whole numbers
      const formatted = digitsOnly ? Number(digitsOnly).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : ''

      setForm((f) => ({ ...f, [name]: formatted }))
      // Mettre à jour la valeur brute et le flag de modification
      setRawMontant(digitsOnly === '' ? 0 : Number(digitsOnly))
      setMontantTouched(true)

      // Restore caret based on number of digits to the left of the caret
      requestAnimationFrame(() => {
        const el = montantRef.current
        if (!el) return
        let seenDigits = 0
        let newPos = formatted.length
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            seenDigits++
          }
          if (seenDigits >= leftDigitsCount) {
            newPos = i + 1
            break
          }
        }
        try { el.setSelectionRange(newPos, newPos) } catch {}
      })
      return
    }
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'
      const token = localStorage.getItem('token')
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const isEdit = Boolean(initialValue && initialValue.id)
      const url = isEdit ? `${baseUrl}/api/traites/${initialValue.id}` : `${baseUrl}/api/traites`
      const method = isEdit ? 'PUT' : 'POST'

      // Utiliser la valeur brute uniquement si l'utilisateur a touché le champ montant
      const montantToSend = montantTouched
        ? (rawMontant == null ? 0 : Number(rawMontant))
        : (isEdit ? (Number(initialValue?.montant ?? 0)) : (Number(String(form.montant || '').replace(/\D+/g, '')) || 0))

      const payload = { ...form, montant: montantToSend }
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erreur lors de la sauvegarde')
      }
      const saved = await res.json()
      
      // Popup de confirmation pour nouvelle traite
      if (!isEdit) {
        setSuccessData({
          id: saved.id,
          title: "Traite créée avec succès !",
          message: "Votre traite a été enregistrée avec succès.",
          numero: saved.numero || 'Auto-généré',
          montant: Number(saved.montant).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
        })
        setShowSuccessDialog(true)
      } else {
        onSaved && onSaved(saved)
      }
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false)
    // Redirection vers la page détail après fermeture du dialogue
    if (successData && successData.id) {
      onSaved && onSaved(successData)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {error && <div style={{ gridColumn: '1 / -1', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', borderRadius:6, padding: 8 }}>{error}</div>}

      <div>
        <label>Numéro de la traite </label>
        <input name="numero" value={form.numero} onChange={handleChange} className="form-input" placeholder="Auto" />
      </div>
      <div>
        <label>Nombre de traites</label>
        <input type="number" name="nombre_traites" value={form.nombre_traites} min={1} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>1ere Échéance</label>
        <input type="date" name="echeance" value={form.echeance} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>Date d'émission</label>
        <input type="date" name="date_emission" value={form.date_emission} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>Montant de crédit</label>
        <input
          type="text"
          inputMode="numeric"
          name="montant"
          value={form.montant}
          onChange={handleChange}
          required
          className="form-input"
          placeholder="Montant en chiffres (sans décimales)"
          ref={montantRef}
        />
      </div>
      <div>
        <label>Nom et prénom ou raison sociale</label>
        <input name="nom_raison_sociale" value={form.nom_raison_sociale} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>Domiciliation bancaire</label>
        <input name="domiciliation_bancaire" value={form.domiciliation_bancaire} onChange={handleChange} className="form-input" />
      </div>
      <div>
        <label>RIB</label>
        <input name="rib" value={form.rib} onChange={handleChange} className="form-input" />
      </div>
      <div>
        <label>Motif de la traite</label>
        <input name="motif" value={form.motif} onChange={handleChange} className="form-input" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label>Commentaires</label>
        <textarea name="commentaires" value={form.commentaires} onChange={handleChange} rows={3} className="form-input" />
      </div>

      {/* <div>
        <label>Statut de la traite</label>
        <select name="statut" value={form.statut} onChange={handleChange} className="form-input">
          <option>Non échu</option>
          <option>Échu</option>
          <option>Impayé</option>
          <option>Rejeté</option>
          <option>Payé</option>
        </select>
      </div> */}

      <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'nowrap' }}>
        <button type="button" onClick={onCancel} disabled={submitting} className="logout-button">Annuler</button>
        <button type="submit" disabled={submitting} className="submit-button">{submitting ? 'Enregistrement...' : (submitLabel || (initialValue?.id ? 'Modifier' : 'Créer'))}</button>
      </div>
    </form>

    {showSuccessDialog && successData && (
      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        title={successData.title}
        message={successData.message}
        numero={successData.numero}
        montant={successData.montant}
      />
    )}
    </>
  )
}

export default TraiteForm


