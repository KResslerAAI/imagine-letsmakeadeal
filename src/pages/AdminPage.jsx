import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

// ── State metadata ────────────────────────────────────────────────────────────
const STATE_LABELS = {
  lobby:             'Lobby — Waiting',
  round1_open:       'Round 1 — Open',
  round1_closed:     'Round 1 — Closed',
  round1_revealed:   'Round 1 — Results Revealed',
  round2_open:       'Round 2 — Open',
  round2_closed:     'Round 2 — Closed',
  results_revealed:  'Final Results Revealed',
}

const ADVANCE_ACTIONS = [
  { toState: 'round1_open',      label: 'Open Round 1' },
  { toState: 'round1_closed',    label: 'Close Round 1' },
  { toState: 'round1_revealed',  label: 'Reveal Round 1 Results' },
  { toState: 'round2_open',      label: 'Open Round 2' },
  { toState: 'round2_closed',    label: 'Close Round 2' },
  { toState: 'results_revealed', label: 'Reveal Final Results' },
]

const STATE_ORDER = ['lobby', 'round1_open', 'round1_closed', 'round1_revealed', 'round2_open', 'round2_closed', 'results_revealed']

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword]       = useState(() => sessionStorage.getItem('lmad:admin:pw') || '')
  const [authed, setAuthed]           = useState(false)
  const [authError, setAuthError]     = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [gameData, setGameData]       = useState(null)
  const [useCaseEdits, setUCEdits]    = useState(null)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMsg, setConfigMsg]     = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [resetConfirm, setResetConfirm]   = useState(false)
  const [attendeeUrl, setAttendeeUrl] = useState('')

  useEffect(() => { setAttendeeUrl(window.location.origin) }, [])

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/get-state')
      if (res.ok) {
        const data = await res.json()
        setGameData(data)
        setUCEdits(prev => prev === null ? data.useCases.map(uc => ({ ...uc })) : prev)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchState()
    const t = setInterval(fetchState, 3000)
    return () => clearInterval(t)
  }, [authed, fetchState])

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, action: 'verify' }),
      })
      if (res.status === 401) { setAuthError('Incorrect password'); return }
      if (!res.ok) { setAuthError('Connection error'); return }
      sessionStorage.setItem('lmad:admin:pw', password)
      setAuthed(true)
    } catch {
      setAuthError('Connection error')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Admin API helper ───────────────────────────────────────────────────────
  const callAdmin = async (action, payload = {}) => {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action, payload }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Request failed')
    }
    return res.json()
  }

  const handleStateChange = async (toState) => {
    setActionLoading(true)
    try {
      await callAdmin('set_state', { state: toState })
      await fetchState()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    setConfigSaving(true)
    setConfigMsg('')
    try {
      await callAdmin('update_config', { useCases: useCaseEdits })
      setConfigMsg('Saved!')
      await fetchState()
      setTimeout(() => setConfigMsg(''), 2500)
    } catch (err) {
      setConfigMsg(err.message)
    } finally {
      setConfigSaving(false)
    }
  }

  const handleReset = async () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    setActionLoading(true)
    try {
      await callAdmin('reset')
      setUCEdits(null)
      setResetConfirm(false)
      await fetchState()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = () => {
    window.open(`/api/export?password=${encodeURIComponent(password)}`, '_blank')
  }

  const downloadQR = () => {
    const canvas = document.getElementById('admin-qr-canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'attendee-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f9fafb' }}>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#FF6600,#cc4400)' }}>
              <span className="text-white font-black text-xs">AA</span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg leading-tight">Admin Panel</p>
              <p className="text-gray-400 text-xs">Let's Make a Deal</p>
            </div>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            required
            className="w-full border-2 rounded-xl px-4 py-3 text-gray-900 focus:outline-none mb-3 transition-colors"
            style={{ borderColor: authError ? '#ef4444' : '#e5e7eb' }}
          />
          {authError && (
            <p className="text-red-500 text-sm mb-3">{authError}</p>
          )}
          <button
            type="submit"
            disabled={!password || authLoading}
            className="w-full py-3 rounded-xl font-bold text-white transition-colors"
            style={{ background: password && !authLoading ? '#FF6600' : '#ccc' }}
          >
            {authLoading ? 'Checking…' : 'Sign In'}
          </button>
        </form>
      </div>
    )
  }

  if (!gameData || !useCaseEdits) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f9fafb' }}>
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    )
  }

  const currentIdx = STATE_ORDER.indexOf(gameData.state)
  const nextState  = STATE_ORDER[currentIdx + 1] || null

  const r1Count = gameData.round1Results?.participantCount || 0
  const r2Count = gameData.round2Results?.participantCount || 0

  // ── Admin dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-5" style={{ background: '#f3f4f6' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Let's Make a Deal: Automation Edition</p>
          </div>
          <span className="font-bold text-white text-xs px-3 py-1.5 rounded-full uppercase tracking-wide"
                style={{ background: '#FF6600' }}>
            {STATE_LABELS[gameData.state] || gameData.state}
          </span>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-5 grid grid-cols-3 gap-4">
          {[
            { label: 'Round 1 Votes', value: r1Count },
            { label: 'Round 2 Votes', value: r2Count },
            { label: 'Total Players', value: Math.max(r1Count, r2Count) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{label}</p>
              <p className="text-3xl font-black text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Game Controls */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-1">Game Controls</p>
          <p className="text-sm text-gray-400 mb-4">
            Click the <span className="font-semibold" style={{ color: '#FF6600' }}>orange button</span> to advance to the next step. The presenter screen updates automatically.
          </p>
          <div className="flex flex-col gap-2">
            {ADVANCE_ACTIONS.map(({ toState, label }) => {
              const idx    = STATE_ORDER.indexOf(toState)
              const isNext = toState === nextState
              const isDone = idx <= currentIdx
              return (
                <button
                  key={toState}
                  onClick={() => isNext && handleStateChange(toState)}
                  disabled={!isNext || actionLoading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-left transition-all"
                  style={{
                    background: isNext ? '#FF6600' : isDone ? '#f3f4f6' : '#fafafa',
                    color:      isNext ? '#fff'    : isDone ? '#9ca3af' : '#d1d5db',
                    cursor:     isNext ? 'pointer' : 'default',
                  }}
                >
                  {isDone ? '✓ ' : ''}{label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Use Case Config */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">
            Use Case Configuration
          </p>
          <div className="flex flex-col gap-4">
            {useCaseEdits.map((uc, i) => (
              <div key={i} className="rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#FF6600' }}>
                  Use Case {i + 1}
                </p>
                <input
                  value={uc.title}
                  onChange={(e) => setUCEdits(prev => {
                    const next = [...prev]; next[i] = { ...next[i], title: e.target.value }
                    setConfigMsg(''); return next
                  })}
                  placeholder="Title"
                  className="w-full border-2 border-gray-100 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-orange-400 mb-2"
                />
                <textarea
                  value={uc.description}
                  onChange={(e) => setUCEdits(prev => {
                    const next = [...prev]; next[i] = { ...next[i], description: e.target.value }
                    setConfigMsg(''); return next
                  })}
                  placeholder="Short description (optional)"
                  rows={2}
                  className="w-full border-2 border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-orange-400 resize-none"
                />
              </div>
            ))}
            {configMsg && (
              <p className={`text-sm font-medium ${configMsg === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>
                {configMsg}
              </p>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={configSaving}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-colors"
              style={{ background: configSaving ? '#ccc' : '#FF6600' }}
            >
              {configSaving ? 'Saving…' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Attendee QR Code</p>
          <div className="flex items-start gap-6">
            <div className="rounded-xl p-3 border border-gray-100">
              <QRCodeCanvas value={attendeeUrl || 'https://example.com'} size={140} id="admin-qr-canvas" />
            </div>
            <div className="flex flex-col gap-2 justify-center">
              <p className="text-gray-500 text-sm break-all">{attendeeUrl}</p>
              <button
                onClick={downloadQR}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm transition-colors"
              >
                Download PNG
              </button>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Data Export</p>
          <button
            onClick={handleExport}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-bold text-sm transition-colors mb-3"
          >
            Export Votes CSV
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Danger Zone</p>
          <button
            onClick={handleReset}
            disabled={actionLoading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-colors"
            style={{
              background: resetConfirm ? '#dc2626' : '#fef2f2',
              color:      resetConfirm ? '#fff'    : '#dc2626',
            }}
          >
            {resetConfirm ? 'Tap again to confirm — this deletes ALL votes' : 'Reset Game (clears all votes)'}
          </button>
          {resetConfirm && (
            <button
              onClick={() => setResetConfirm(false)}
              className="w-full mt-2 text-gray-400 text-sm py-1"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => { sessionStorage.removeItem('lmad:admin:pw'); setAuthed(false) }}
          className="text-gray-400 text-sm py-2 hover:text-gray-600"
        >
          Sign out
        </button>

      </div>
    </div>
  )
}
