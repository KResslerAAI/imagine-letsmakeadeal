import { useState, useEffect, useCallback } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const TOTAL_BUDGET = 300000
const POLL_MS = 3000

// ── localStorage helpers ──────────────────────────────────────────────────────
function getLS(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// Ensure this device has a stable ID
if (!getLS('lmad:id')) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  setLS('lmad:id', id)
}

// ── Formatting ────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Math.abs(Number(n)).toLocaleString('en-US')

// ── AA / Imagine logo mark ────────────────────────────────────────────────────
function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded flex items-center justify-center"
           style={{ background: 'linear-gradient(135deg,#FF6600,#cc4400)' }}>
        <span className="text-white font-black text-xs leading-none">AA</span>
      </div>
      <span className="text-white/50 text-xs uppercase tracking-[0.2em] font-semibold">Imagine 2026</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AttendeePage() {
  const [gameData, setGameData]       = useState(null)
  const [name, setName]               = useState(() => getLS('lmad:name', ''))
  const [round1Voted, setRound1Voted] = useState(() => getLS('lmad:r1voted', false))
  const [round2Voted, setRound2Voted] = useState(() => getLS('lmad:r2voted', false))
  const [round1Votes, setRound1Votes] = useState(() => getLS('lmad:r1votes', null))
  const [round2Votes, setRound2Votes] = useState(() => getLS('lmad:r2votes', null))
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/get-state')
      if (res.ok) setGameData(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchState()
    const t = setInterval(fetchState, POLL_MS)
    return () => clearInterval(t)
  }, [fetchState])

  const handleNameSubmit = (n) => { setLS('lmad:name', n); setName(n) }

  const handleVote = async (round, amounts) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId:   getLS('lmad:id'),
          attendeeName: name,
          round,
          amounts,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Submission failed')
      }
      if (round === 1) {
        setLS('lmad:r1voted', true); setRound1Voted(true)
        setLS('lmad:r1votes', amounts); setRound1Votes(amounts)
      } else {
        setLS('lmad:r2voted', true); setRound2Voted(true)
        setLS('lmad:r2votes', amounts); setRound2Votes(amounts)
      }
    } catch (e) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!name) return <WelcomeScreen onSubmit={handleNameSubmit} />
  if (!gameData) return <Splash />

  const { state, useCases } = gameData

  if (state === 'lobby')
    return <LobbyWait name={name} />

  if (state === 'round1_open')
    return round1Voted
      ? <Holding message="Your Round 1 vote is in! Watch the screen — Round 2 starts soon." />
      : <VotingScreen round={1} useCases={useCases}
          onSubmit={(a) => handleVote(1, a)}
          submitting={submitting} error={submitError} />

  if (state === 'round1_closed' || state === 'round1_revealed')
    return <Holding message="Round 1 is complete. Watch the screen — Round 2 starts soon." />

  if (state === 'round2_open')
    return round2Voted
      ? <Holding message="Your Round 2 vote is in! Watch the screen for the winner." />
      : <VotingScreen round={2} useCases={useCases}
          onSubmit={(a) => handleVote(2, a)}
          submitting={submitting} error={submitError} />

  if (state === 'round2_closed')
    return <Holding message="Voting is closed. Watch the screen for the final results!" />

  if (state === 'results_revealed')
    return <FinalScreen name={name} useCases={useCases}
             round1Votes={round1Votes} round2Votes={round2Votes} />

  return <Holding message="Stay tuned…" />
}

// ── WelcomeScreen ─────────────────────────────────────────────────────────────
function WelcomeScreen({ onSubmit }) {
  const [input, setInput] = useState('')
  return (
    <div className="min-h-screen flex flex-col px-6 py-8" style={{ background: '#1A1A1A' }}>

      <main className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] font-bold mb-3" style={{ color: '#FF6600' }}>
          Time to invest!
        </p>
        <h1 className="text-4xl font-black text-white leading-tight mb-5">
          Let's Make a Deal:<br />
          <span style={{ color: '#FF6600' }}>Automation Edition</span>
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-10">
          You'll hear three automation pitches and allocate{' '}
          <span className="text-white font-semibold">$300,000</span> across
          them — twice. The use case with the biggest gain wins.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) onSubmit(input.trim()) }}
              className="flex flex-col gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-2">Your Name</label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              required
              className="w-full rounded-xl px-4 py-4 text-white text-lg placeholder:text-white/25 focus:outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: `2px solid ${input.trim() ? '#FF6600' : 'rgba(255,255,255,0.15)'}`,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider text-white transition-all active:scale-[0.98]"
            style={{
              background: input.trim() ? '#FF6600' : 'rgba(255,255,255,0.15)',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Start
          </button>
        </form>
      </main>
    </div>
  )
}

// ── Splash (loading) ──────────────────────────────────────────────────────────
function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A1A' }}>
      <div className="text-white/30 text-lg animate-pulse">Loading…</div>
    </div>
  )
}

// ── LobbyWait ─────────────────────────────────────────────────────────────────
function LobbyWait({ name }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
         style={{ background: '#1A1A1A' }}>
      <p className="text-xs uppercase tracking-[0.25em] font-bold mb-3" style={{ color: '#FF6600' }}>
        Welcome, {name}!
      </p>
      <h1 className="text-3xl font-black text-white mb-4">Game starting soon</h1>
      <p className="text-white/50 max-w-xs">Watch the screen at the front of the room for instructions.</p>
    </div>
  )
}

// ── Holding ───────────────────────────────────────────────────────────────────
function Holding({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
         style={{ background: '#1A1A1A' }}>
      <p className="text-white text-xl font-semibold leading-relaxed max-w-xs">{message}</p>
    </div>
  )
}

// ── VotingScreen ──────────────────────────────────────────────────────────────
function VotingScreen({ round, useCases, onSubmit, submitting, error }) {
  const [amounts, setAmounts] = useState([0, 0, 0])

  const total     = amounts.reduce((s, a) => s + (Number(a) || 0), 0)
  const remaining = TOTAL_BUDGET - total
  const isValid   = remaining === 0 && amounts.every(a => Number(a) >= 0)

  const setAmt = (i, raw) => {
    const n = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0)
    setAmounts(prev => { const next = [...prev]; next[i] = n; return next })
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-5" style={{ background: '#1A1A1A' }}>
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.25em] font-bold mb-1" style={{ color: '#FF6600' }}>
          Round {round} of 2
        </p>
        <h1 className="text-2xl font-black text-white">Allocate Your Budget</h1>
        <p className="text-white/60 text-sm mt-0.5">
          Distribute <span className="text-white font-semibold">$300,000</span> across the three use cases.
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {useCases.map((uc, i) => (
          <div key={uc.id} className="rounded-2xl p-4 shadow-lg" style={{ background: '#fff' }}>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#aaa' }}>
              Use Case {i + 1}
            </p>
            <h2 className="text-base font-bold mt-0.5 leading-snug" style={{ color: '#111' }}>
              {uc.title}
            </h2>
            {uc.description && (
              <p className="text-sm mt-1 leading-snug" style={{ color: '#666' }}>{uc.description}</p>
            )}
            <div className="mt-3 flex items-center rounded-xl overflow-hidden"
                 style={{ border: `2px solid ${amounts[i] > 0 ? '#FF6600' : '#e5e7eb'}` }}>
              <span className="pl-4 font-bold text-lg" style={{ color: '#aaa' }}>$</span>
              <input
                type="number"
                inputMode="numeric"
                value={amounts[i] || ''}
                onChange={(e) => setAmt(i, e.target.value)}
                placeholder="0"
                min="0"
                max="300000"
                className="flex-1 bg-transparent px-2 py-3 text-lg font-bold focus:outline-none"
                style={{ color: '#111' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Running total */}
      <div className="mt-4 rounded-2xl p-4 text-center transition-all"
           style={{
             background: isValid ? '#FF6600' : remaining < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
             border: remaining < 0 ? '1px solid rgba(239,68,68,0.4)' : 'none',
           }}>
        <p className="text-xs uppercase tracking-widest font-semibold mb-1"
           style={{ color: isValid ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)' }}>
          {isValid ? 'Budget fully allocated!' : remaining > 0 ? 'Remaining to allocate' : 'Over budget'}
        </p>
        <p className="text-4xl font-black"
           style={{ color: remaining < 0 ? '#f87171' : '#fff' }}>
          {fmt(remaining)}
        </p>
      </div>

      {error && <p className="mt-3 text-center text-sm" style={{ color: '#f87171' }}>{error}</p>}

      <button
        onClick={() => isValid && !submitting && onSubmit(amounts)}
        disabled={!isValid || submitting}
        className="mt-4 w-full py-5 rounded-2xl font-black text-lg uppercase tracking-wider text-white transition-all active:scale-[0.98]"
        style={{
          background: isValid && !submitting ? '#FF6600' : 'rgba(255,255,255,0.12)',
          cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Vote'}
      </button>
    </div>
  )
}

// ── FinalScreen ───────────────────────────────────────────────────────────────
function FinalScreen({ name, useCases, round1Votes, round2Votes }) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-8" style={{ background: '#1A1A1A' }}>
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] font-bold mb-2" style={{ color: '#FF6600' }}>
          All done, {name}!
        </p>
        <h1 className="text-2xl font-black text-white">Watch the screen for the winner.</h1>
      </header>

      {(round1Votes || round2Votes) && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Your Allocations</p>
          <div className="flex flex-col gap-3">
            {useCases.map((uc, i) => (
              <div key={uc.id} className="rounded-xl p-4"
                   style={{ background: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white/50 text-xs uppercase tracking-widest truncate">{uc.title}</p>
                <div className="flex gap-4 mt-2">
                  <div className="flex-1 text-center">
                    <p className="text-white/40 text-xs mb-1">Round 1</p>
                    <p className="text-white font-bold">
                      {round1Votes ? fmt(round1Votes[i]) : '—'}
                    </p>
                  </div>
                  <div className="w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div className="flex-1 text-center">
                    <p className="text-xs mb-1" style={{ color: '#FF6600' }}>Round 2</p>
                    <p className="text-white font-bold">
                      {round2Votes ? fmt(round2Votes[i]) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
