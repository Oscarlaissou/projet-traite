import React, { useEffect, useState } from "react"

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

  useEffect(() => {
    if (initialValue) {
      setForm({ ...defaultForm, ...initialValue })
    }
  }, [initialValue])

  const handleChange = (e) => {
    const { name, value } = e.target
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

      const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erreur lors de la sauvegarde')
      }
      const saved = await res.json()
      onSaved && onSaved(saved)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
        <label>Échéance</label>
        <input type="date" name="echeance" value={form.echeance} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>Date d'émission</label>
        <input type="date" name="date_emission" value={form.date_emission} onChange={handleChange} required className="form-input" />
      </div>
      <div>
        <label>Montant de la traite</label>
        <input type="number" step="0.01" name="montant" value={form.montant} onChange={handleChange} required className="form-input" />
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

      <div style={{  display: 'flex', gap: 100, marginTop: 10, marginLeft: '500px' }}>
        <button type="button" onClick={onCancel} disabled={submitting} className="logout-button">Annuler</button>
        <button type="submit" disabled={submitting} className="submit-button">{submitting ? 'Enregistrement...' : (submitLabel || (initialValue?.id ? 'Modifier' : 'Créer'))}</button>
      </div>
    </form>
  )
}

export default TraiteForm


