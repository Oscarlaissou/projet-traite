import React, { useEffect, useMemo, useRef, useState } from "react"
import { Bell, AlertTriangle, Clock, Users, FileText } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

const NotificationsMenu = () => {
  const baseUrl = useMemo(() => process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000', [])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [count, setCount] = useState(0)
  const [pendingClientsCount, setPendingClientsCount] = useState(0)
  const [recentBills, setRecentBills] = useState([])
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
    const isEchuStatus = (s) => normalize(s).includes('echu')

    // On ne se base pas sur le statut pour classer; uniquement la date (sauf exclusion payé)

    for (const t of records) {
      const echeance = isDate(t.echeance)
      if (!echeance) continue
      const isPaid = isPaidStatus(t.statut)
      if (isPaid) continue

      const diff = dayDiff(echeance, startOfToday)
      // Ignorer les échéances passées (hier et avant)
      if (diff < 0) continue
      // Jour J: inclure Non échu ET déjà Échu (pour notification immédiate)
      if (diff === 0 && (isNonEchuStatus(t.statut) || isEchuStatus(t.statut))) {
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
      // Construire YYYY-MM-DD (local) pour aujourd'hui
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`

      // 1) Aujourd'hui (tous statuts) via plage echeance_from/echeance_to
      const p1 = (async () => {
        const p = new URLSearchParams()
        p.append('per_page', '200')
        p.append('page', '1')
        p.append('echeance_from', todayStr)
        p.append('echeance_to', todayStr)
        p.append('sort', 'numero')
        p.append('dir', 'desc')
        const res = await fetch(`${baseUrl}/api/traites?${p.toString()}`, { headers: authHeaders() })
        if (!res.ok) throw new Error('Erreur chargement (aujourd\'hui)')
        const data = await res.json()
        return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      })()

      // 2) À venir (Non échu) sous 3 jours
      const p2 = (async () => {
        const p = new URLSearchParams()
        p.append('per_page', '200')
        p.append('upcoming_days', '3')
        p.append('sort', 'numero')
        p.append('dir', 'desc')
        const res = await fetch(`${baseUrl}/api/traites?${p.toString()}`, { headers: authHeaders() })
        if (!res.ok) throw new Error('Erreur chargement (à venir)')
        const data = await res.json()
        return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      })()

      const [rowsTodayRaw, upcomingRows] = await Promise.all([p1, p2])

      // Construire sections pour à venir avec l'existant
      const { mapped } = computeNotifications(upcomingRows)

      // Filtrages communs
      const dismissed = new Set(getDismissed())
      const notPaid = (s) => {
        const v = String(s || '').toLowerCase()
        return !(v.includes('payé') || v.includes('paye'))
      }

      // Filtrer sections et aujourd'hui
      const filteredSections = mapped.map(sec => ({
        ...sec,
        items: sec.items.filter(it => !dismissed.has(it.id))
      }))
      const filteredToday = rowsTodayRaw.filter(it => notPaid(it.statut) && !dismissed.has(it.id))

      // Mettre à jour état et badge
      setItems(filteredSections)
      setTodayItems(filteredToday)
      const newCount = filteredSections.reduce((acc, sec) => acc + sec.items.length, 0) + filteredToday.length
      setCount(newCount)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
      setItems([])
      setTodayItems([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingClients = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/pending-clients`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement (clients en attente)')
      const data = await res.json()
      const clientCount = data?.count || 0
      setPendingClientsCount(clientCount)
    } catch (e) {
      console.error('Erreur chargement clients en attente:', e.message || 'Erreur inconnue')
      setPendingClientsCount(0)
    }
  }

  const fetchRecentBills = async () => {
    try {
      // Fetch bills created in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const fromDate = fiveMinutesAgo.toISOString().split('T')[0]
      
      const p = new URLSearchParams()
      p.append('per_page', '100')
      p.append('page', '1')
      p.append('sort', 'created_at')
      p.append('dir', 'desc')
      p.append('from', fromDate)
      
      const res = await fetch(`${baseUrl}/api/traites?${p.toString()}`, { headers: authHeaders() })
      if (!res.ok) throw new Error('Erreur chargement (traites récentes)')
      const data = await res.json()
      const bills = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      
      // Filter for truly recent bills (created in last 5 minutes)
      const now = new Date()
      const cutoffTime = new Date(now.getTime() - 5 * 60 * 1000)
      const recent = bills.filter(bill => {
        const createdAt = new Date(bill.created_at)
        return createdAt >= cutoffTime
      })
      
      setRecentBills(recent)
    } catch (e) {
      console.error('Erreur chargement traites récentes:', e.message || 'Erreur inconnue')
      setRecentBills([])
    }
  }

  useEffect(() => {
    fetchData()
    fetchPendingClients()
    fetchRecentBills()
    const id = setInterval(() => {
      fetchData()
      fetchPendingClients()
      fetchRecentBills()
    }, 5000) // refresh chaque 5s
    return () => clearInterval(id)
  }, [])

  // Réagir aux dismiss déclenchés ailleurs (page notifications)
  useEffect(() => {
    const onExternalDismiss = () => {
      const dismissed = new Set(getDismissed())
      setItems(prev => {
        const next = prev.map(sec => ({ ...sec, items: sec.items.filter(it => !dismissed.has(it.id)) }))
        return next
      })
      setTodayItems(prev => prev.filter(it => !dismissed.has(it.id)))
      setCount(prev => {
        const itemsCount = (arr) => arr.reduce((acc, sec) => acc + sec.items.length, 0)
        const currentItems = typeof items === 'object' ? items : []
        const nextItemsCount = itemsCount(currentItems)
        const nextTodayCount = Math.max(0, (Array.isArray(todayItems) ? todayItems.length : 0) - 0)
        return nextItemsCount + nextTodayCount
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

  // Compter le nombre total de notifications
  useEffect(() => {
    const todayCount = todayItems.length
    const otherCount = items.reduce((sum, section) => sum + section.items.length, 0)
    const recentBillsCount = recentBills.length
    setCount(todayCount + otherCount + pendingClientsCount + recentBillsCount)
  }, [todayItems, items, pendingClientsCount, recentBills])

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
    // Rafraîchir immédiatement depuis l'API pour refléter l'état réel
    fetchData().catch(() => {})
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
                <div key={it.id} className="notif-today-card" onClick={() => handleClickItem(it.id)} style={{ border: '2px solid #f59e0b', background: '#fff7ed', borderRadius: 8, padding: 8, marginBottom: 8, cursor: 'pointer' }}>
                  <div className="notif-item-label" style={{ fontWeight: 600, color: '#92400e' }}>{it.numero} • {it.nom_raison_sociale}</div>
                  <div className="notif-item-sub" style={{ color: '#92400e' }}>Échéance aujourd'hui — passe/échue • {new Date(it.echeance).toLocaleDateString('fr-FR')}</div>
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
          {recentBills.length > 0 && (
            <div className="notif-section">
              <div className="notif-section-title"><FileText size={16} /> <span style={{ marginLeft: 6 }}>Nouvelles traites</span></div>
              <ul className="notif-list">
                {recentBills.map(bill => (
                  <li key={bill.id} className="notif-item" onClick={() => { setOpen(false); navigate(`/traites/${bill.id}`); }} style={{ cursor: 'pointer' }}>
                    <div className="notif-item-label">{bill.numero} • {bill.nom_raison_sociale}</div>
                    <div className="notif-item-sub">Traite créée récemment</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pendingClientsCount > 0 && (
            <div className="notif-section">
              <div className="notif-section-title"><Users size={16} /> <span style={{ marginLeft: 6 }}>Clients en attente</span></div>
              <ul className="notif-list">
                <li className="notif-item" onClick={() => { setOpen(false); navigate('/dashboard?tab=credit&view=PendingClients'); }} style={{ cursor: 'pointer' }}>
                  <div className="notif-item-label">{pendingClientsCount} nouveau(x) client(s) en attente</div>
                  <div className="notif-item-sub">Cliquez pour voir les détails</div>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsMenu


