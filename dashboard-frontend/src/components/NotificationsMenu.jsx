import React, { useEffect, useMemo, useRef, useState } from "react"
import { Bell, AlertTriangle, Clock } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

const NotificationsMenu = () => {
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000', [])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [count, setCount] = useState(0)
  const menuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const authHeaders = () => {
    const token = localStorage.getItem('token')
    const headers = { 'Accept': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  const isDate = (val) => {
    if (!val) return null
    // parse YYYY-MM-DD or leading part of 'YYYY-MM-DD ...' as local date to avoid TZ shifts
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const datePart = val.slice(0, 10)
      const [y, m, d] = datePart.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return isNaN(dt.getTime()) ? null : dt
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }

  const computeNotifications = (records) => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const upcoming = []
    const todayArr = []

    const dayDiff = (d1, d2) => {
      const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime()
      const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime()
      return Math.round((t1 - t2) / 86400000)
    }

    const normalize = (s) => String(s || '')
      .toLowerCase()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ûü]/g, 'u')
    const isPaidStatus = (s) => {
      const v = normalize(s)
      if (v.includes('impay')) return false
      if (v.includes('non pay')) return false
      return v.includes('pay')
    }
    const isNonEchuStatus = (s) => {
      const v = normalize(s).trim()
      // Exiger exactement "non echu" (accents/majuscules ignorés)
      return v === 'non echu'
    }

    // On ne se base pas sur le statut pour classer; uniquement la date (sauf exclusion payé)

    for (const t of records) {
      const echeance = isDate(t.echeance)
      if (!echeance) continue
      const isPaid = isPaidStatus(t.statut)
      if (isPaid) continue

      const diff = dayDiff(echeance, startOfToday)
      // Ignorer les échues
      if (diff < 0) continue
      // Jour J en haut
      if (diff === 0 && isNonEchuStatus(t.statut)) {
        todayArr.push(t)
        continue
      }
      // Sous 3 jours (1..2) si statut Non échu
      if (isNonEchuStatus(t.statut) && diff > 0 && diff < 3) {
        upcoming.push(t)
      }
    }

    // Sort by date ascending
    upcoming.sort((a, b) => new Date(a.echeance) - new Date(b.echeance))
    todayArr.sort((a, b) => new Date(a.echeance) - new Date(b.echeance))

    const mapped = []
    if (upcoming.length) {
      mapped.push({
        type: 'upcoming',
        title: 'À échéance sous 3 jours',
        icon: <Clock size={16} color="#1f2c49" />,
        items: upcoming.map(t => ({
          id: t.id,
          label: `${t.numero} • ${t.nom_raison_sociale}`,
          sub: `Échéance: ${new Date(t.echeance).toLocaleDateString('fr-FR')}`,
        }))
      })
    }

    return { mapped, count: upcoming.length + todayArr.length, today: todayArr }
  }

  const getDismissed = () => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]') } catch { return [] }
  }

  const setDismissed = (ids) => {
    localStorage.setItem('dismissed_notifs', JSON.stringify(ids))
  }

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.append('per_page', '200')
      params.append('upcoming_days', '3')
      const res = await fetch(`${baseUrl}/api/traites?${params.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement traites')
      const data = await res.json()
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      const { mapped, count, today } = computeNotifications(rows)
      // filtrer les notifs déjà dismiss
      const dismissed = new Set(getDismissed())
      const filtered = mapped.map(sec => ({
        ...sec,
        items: sec.items.filter(it => !dismissed.has(it.id))
      }))
      const filteredToday = today.filter(it => !dismissed.has(it.id))
      const newCount = filtered.reduce((acc, sec) => acc + sec.items.length, 0) + filteredToday.length
      setItems(filtered)
      setTodayItems(filteredToday)
      setCount(newCount)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
      setItems([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 60000) // refresh chaque 60s
    return () => clearInterval(id)
  }, [])

  // Réagir aux dismiss déclenchés ailleurs (page notifications)
  useEffect(() => {
    const onExternalDismiss = () => {
      const dismissed = new Set(getDismissed())
      setItems(prev => {
        const next = prev.map(sec => ({ ...sec, items: sec.items.filter(it => !dismissed.has(it.id)) }))
        const nextCount = next.reduce((acc, sec) => acc + sec.items.length, 0)
        setCount(nextCount)
        return next
      })
    }
    window.addEventListener('dismissed_notifs_changed', onExternalDismiss)
    return () => window.removeEventListener('dismissed_notifs_changed', onExternalDismiss)
  }, [])

  // Ouvrir via sidebar: ?tab=notifications
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') === 'notifications') {
      setOpen(true)
    }
  }, [location.search])

  // Fermer au clic extérieur
  useEffect(() => {
    const onClick = (e) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleClickItem = (id) => {
    // marquer comme vu → décrémente badge
    const dismissed = getDismissed()
    if (!dismissed.includes(id)) {
      dismissed.push(id)
      setDismissed(dismissed)
      // notifier les autres composants
      window.dispatchEvent(new Event('dismissed_notifs_changed'))
    }
    setItems(prev => prev.map(sec => ({ ...sec, items: sec.items.filter(it => it.id !== id) })))
    setTodayItems(prev => prev.filter(it => it.id !== id))
    setCount(prev => Math.max(0, prev - 1))
    // naviguer vers la fiche traite
    navigate(`/traites/${id}`)
  }

  return (
    <div className="notif-container" ref={menuRef}>
      <button className="notif-bell" onClick={() => setOpen(o => !o)} aria-label="Notifications">
        <Bell size={18} />
        {count > 0 && <span className="notif-badge">{count}</span>}
      </button>
      {open && (
        <div className="notif-menu">
          <div className="notif-header">Notifications</div>
          {todayItems.length > 0 && (
            <div className="notif-today-cards" style={{ padding: 8 }}>
              {todayItems.map(it => (
                <div key={it.id} className="notif-today-card" onClick={() => handleClickItem(it.id)} style={{ border: '1px solid #f59e0b', background: '#fff7ed', borderRadius: 8, padding: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <div className="notif-item-label" style={{ fontWeight: 600, color: '#9a3412' }}>{it.numero} • {it.nom_raison_sociale}</div>
                  <div className="notif-item-sub" style={{ color: '#92400e' }}>Échéance aujourd'hui • {new Date(it.echeance).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
            </div>
          )}
          {loading && <div className="notif-empty">Chargement...</div>}
          {error && <div className="notif-error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="notif-empty">Aucune notification</div>
          )}
          {!loading && !error && items.map(section => (
            <div key={section.type} className="notif-section">
              <div className="notif-section-title">{section.icon} <span style={{ marginLeft: 6 }}>{section.title}</span></div>
              <ul className="notif-list">
                {section.items.map(it => (
                  <li key={it.id} className="notif-item" onClick={() => handleClickItem(it.id)} style={{ cursor: 'pointer' }}>
                    <div className="notif-item-label">{it.label}</div>
                    <div className="notif-item-sub">{it.sub}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsMenu


