import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const POLL_MS = 2500

// ── Formatting ────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + Number(n).toLocaleString('en-US')

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PresenterPage() {
  const [gameData, setGameData]   = useState(null)
  const [attendeeUrl, setUrl]     = useState('')

  useEffect(() => { setUrl(window.location.origin) }, [])

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

  if (!gameData) return <Screen><Centered><p className="text-white/30 text-3xl animate-pulse">Loading…</p></Centered></Screen>

  const { state, useCases, round1Results, round2Results, winner } = gameData

  if (state === 'lobby')            return <LobbyDisplay url={attendeeUrl} />
  if (state === 'round1_open')      return <VotingDisplay round={1} useCases={useCases} />
  if (state === 'round1_closed')    return <ClosedDisplay />
  if (state === 'round1_revealed')  return <RoundResultsDisplay round={1} results={round1Results} useCases={useCases} />
  if (state === 'round2_open')      return <VotingDisplay round={2} useCases={useCases} />
  if (state === 'round2_closed')    return <ClosedDisplay />
  if (state === 'results_revealed') return <FinalResultsDisplay useCases={useCases} round1Results={round1Results} round2Results={round2Results} winner={winner} />

  return <Screen><Centered><p className="text-white/30 text-3xl">Stand by…</p></Centered></Screen>
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function Screen({ children }) {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col" style={{ background: '#1A1A1A' }}>
      {children}
    </div>
  )
}
function Centered({ children }) {
  return <div className="flex-1 flex flex-col items-center justify-center">{children}</div>
}

// ── Logo / branding ───────────────────────────────────────────────────────────
function PresentBrand({ size = 'normal' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded flex items-center justify-center"
           style={{
             background: 'linear-gradient(135deg,#FF6600,#cc4400)',
             width: size === 'large' ? 48 : 36,
             height: size === 'large' ? 48 : 36,
           }}>
        <span className="text-white font-black" style={{ fontSize: size === 'large' ? 18 : 13 }}>AA</span>
      </div>
      <span className="font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: size === 'large' ? 18 : 13 }}>
        Imagine 2026
      </span>
    </div>
  )
}

// ── LobbyDisplay ─────────────────────────────────────────────────────────────
function LobbyDisplay({ url }) {
  return (
    <Screen>
      <Centered>
        <p className="text-3xl font-bold text-white/50 text-center mb-3 uppercase tracking-widest">
          Imagine Dallas
        </p>
        <h1 className="text-7xl font-black text-white text-center leading-tight mb-2">
          Let's Make a Deal
        </h1>
        <p className="text-4xl font-bold text-center mb-12" style={{ color: '#FF6600' }}>
          Automation Edition
        </p>

        <div className="rounded-3xl p-5 shadow-2xl mb-6" style={{ background: '#fff' }}>
          <QRCodeSVG value={url || 'https://example.com'} size={220}
                     bgColor="#ffffff" fgColor="#1A1A1A" level="M" />
        </div>

        <p className="text-3xl font-black uppercase tracking-widest" style={{ color: '#FF6600' }}>
          Scan to play
        </p>
      </Centered>
    </Screen>
  )
}

// ── VotingDisplay ─────────────────────────────────────────────────────────────
function VotingDisplay({ round, useCases }) {
  return (
    <Screen>
      <Centered>
        <p className="text-2xl uppercase tracking-[0.3em] font-bold mb-6" style={{ color: '#FF6600' }}>
          Round {round} of 2
        </p>
        <h1 className="text-8xl font-black text-white text-center mb-16">Voting in progress…</h1>
        <div className="flex gap-8">
          {useCases.map((uc, i) => (
            <div key={uc.id} className="rounded-2xl px-10 py-6 text-center"
                 style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Use Case {i + 1}
              </p>
              <p className="text-3xl font-bold text-white">{uc.title}</p>
            </div>
          ))}
        </div>
      </Centered>
    </Screen>
  )
}

// ── ClosedDisplay ─────────────────────────────────────────────────────────────
function ClosedDisplay() {
  return (
    <Screen>
      <div className="p-10"><PresentBrand /></div>
      <Centered>
        <h1 className="text-8xl font-black text-white text-center mb-4">Voting closed</h1>
        <p className="text-3xl font-bold uppercase tracking-widest" style={{ color: '#FF6600' }}>
          Results coming…
        </p>
      </Centered>
    </Screen>
  )
}

// ── RoundResultsDisplay ────────────────────────────────────────────────────────
function RoundResultsDisplay({ round, results, useCases }) {
  if (!results) {
    return (
      <Screen>
        <Centered><p className="text-white/30 text-3xl">Tallying votes…</p></Centered>
      </Screen>
    )
  }

  const maxAmt = Math.max(...results.amounts)
  const grandTotal = results.amounts.reduce((a, b) => a + b, 0)

  return (
    <Screen>
      <div className="px-16 pt-10 pb-2">
        <p className="text-3xl uppercase tracking-[0.2em] font-bold mb-1" style={{ color: '#FF6600' }}>
          Round {round} Results
        </p>
        <p className="text-white/50 text-xl">
          {results.participantCount} {results.participantCount === 1 ? 'participant' : 'participants'}
          &nbsp;·&nbsp;{fmt(grandTotal)} total invested
        </p>
      </div>

      <div className="flex-1 flex flex-row items-end px-16 pb-12 gap-6">
        {useCases.map((uc, i) => {
          const isLeading = results.amounts[i] === maxAmt
          const barPct = maxAmt > 0 ? (results.amounts[i] / maxAmt) * 100 : 0
          return (
            <div key={uc.id} className="flex-1 flex flex-col items-center">
              {/* Dollar + percent */}
              <p className="font-black mb-2 text-center"
                 style={{ fontSize: 48, color: isLeading ? '#FF6600' : '#fff' }}>
                {fmt(results.amounts[i])}
              </p>
              <p className="font-bold mb-4 text-center"
                 style={{ fontSize: 24, color: 'rgba(255,255,255,0.35)' }}>
                {results.percentages[i]}%
              </p>
              {/* Vertical bar */}
              <div className="w-full rounded-xl overflow-hidden flex flex-col justify-end"
                   style={{ height: 280, background: 'rgba(255,255,255,0.08)' }}>
                <div className="w-full rounded-xl transition-all duration-1000"
                     style={{
                       height: `${barPct}%`,
                       background: isLeading ? '#FF6600' : '#6B2D8B',
                     }} />
              </div>
              {/* Label */}
              <p className="mt-4 text-center uppercase tracking-widest font-semibold"
                 style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                Use Case {i + 1}
              </p>
              <p className="mt-1 text-center font-bold text-white"
                 style={{ fontSize: 20 }}>
                {uc.title}
              </p>
            </div>
          )
        })}
      </div>
    </Screen>
  )
}

// ── FinalResultsDisplay ────────────────────────────────────────────────────────
function FinalResultsDisplay({ useCases, round1Results, round2Results, winner }) {
  if (!round1Results || !round2Results) {
    return (
      <Screen>
        <Centered><p className="text-white/30 text-3xl">Tallying votes…</p></Centered>
      </Screen>
    )
  }

  return (
    <Screen>
      <div className="px-16 pt-12 pb-0">
        <p className="text-3xl uppercase tracking-[0.2em] font-bold text-center text-white">
          Final Results
        </p>
      </div>

      {/* Winner callout */}
      {winner && (
        <div className="mx-16 mt-8 rounded-2xl p-7 text-center" style={{ background: '#FF6600' }}>
          <p className="uppercase tracking-[0.35em] font-bold mb-1" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 18 }}>
            WINNER
          </p>
          <p className="font-black text-white" style={{ fontSize: 52, lineHeight: 1.1 }}>
            {winner.indices.map(i => useCases[i]?.title).join(' & ')}
          </p>
          {winner.delta > 0 && (
            <p className="mt-2 font-semibold" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 26 }}>
              +{fmt(winner.delta)} more in Round 2
            </p>
          )}
        </div>
      )}

      {/* Results columns */}
      <div className="flex-1 flex flex-row px-16 pb-12 pt-8 gap-6">
        {(() => {
          const maxR1 = Math.max(...round1Results.amounts)
          const maxR2 = Math.max(...round2Results.amounts)
          return useCases.map((uc, i) => {
            const r1 = round1Results.amounts[i] || 0
            const r2 = round2Results.amounts[i] || 0
            const delta = r2 - r1
            const pctChange = r1 === 0 ? null : Math.round((delta / r1) * 100)
            const isWinner = winner?.indices?.includes(i)
            const leadsR1 = r1 === maxR1
            const leadsR2 = r2 === maxR2

            const Pill = ({ pct, isGreen }) => (
              <span className="inline-block rounded-full px-3 py-1 text-sm font-semibold mb-5"
                    style={{
                      background: isGreen ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.08)',
                      color: isGreen ? '#4ade80' : 'rgba(255,255,255,0.4)',
                    }}>
                {pct}%
              </span>
            )

            return (
              <div key={uc.id}
                   className="flex-1 flex flex-col items-center text-center rounded-2xl px-8 py-7"
                   style={{
                     background: isWinner ? 'rgba(255,102,0,0.18)' : 'rgba(255,255,255,0.06)',
                     border: isWinner ? '1px solid rgba(255,102,0,0.5)' : '1px solid transparent',
                   }}>
                {/* Use case label + title */}
                <p className="text-xs uppercase tracking-widest mb-1"
                   style={{ color: 'rgba(255,255,255,0.4)' }}>Use Case {i + 1}</p>
                <p className="font-black leading-tight mb-6"
                   style={{ fontSize: 34, color: isWinner ? '#FF6600' : '#fff' }}>
                  {uc.title}
                </p>

                {/* Round 1 */}
                <p className="text-xs uppercase tracking-widest mb-1"
                   style={{ color: 'rgba(255,255,255,0.35)' }}>Round 1</p>
                <p className="font-black text-white mb-2" style={{ fontSize: 26 }}>{fmt(r1)}</p>
                <Pill pct={round1Results.percentages[i]} isGreen={leadsR1} />

                {/* Round 2 */}
                <p className="text-xs uppercase tracking-widest mb-1"
                   style={{ color: 'rgba(255,255,255,0.35)' }}>Round 2</p>
                <p className="font-black mb-2"
                   style={{ fontSize: 26, color: isWinner ? '#FF6600' : '#fff' }}>
                  {fmt(r2)}
                </p>
                <Pill pct={round2Results.percentages[i]} isGreen={leadsR2} />

                {/* Change */}
                <div className="mt-auto pt-5 w-full"
                     style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs uppercase tracking-widest mb-1"
                     style={{ color: 'rgba(255,255,255,0.35)' }}>Change</p>
                  <p className="font-black" style={{
                    fontSize: 40,
                    color: pctChange === null ? 'rgba(255,255,255,0.2)'
                         : pctChange > 0 ? '#4ade80'
                         : pctChange < 0 ? '#f87171'
                         : 'rgba(255,255,255,0.2)',
                  }}>
                    {pctChange === null || pctChange === 0
                      ? '—'
                      : `${pctChange > 0 ? '+' : ''}${pctChange}%`}
                  </p>
                </div>
              </div>
            )
          })
        })()}
      </div>
    </Screen>
  )
}
