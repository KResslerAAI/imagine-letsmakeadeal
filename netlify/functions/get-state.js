import { neon } from '@neondatabase/serverless'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
}

export const handler = async () => {
  try {
    const sql = neon(process.env.DATABASE_URL)

    const [row] = await sql`
      SELECT state,
        use_case_1_title, use_case_1_desc,
        use_case_2_title, use_case_2_desc,
        use_case_3_title, use_case_3_desc
      FROM game_state WHERE id = 1
    `

    const useCases = [
      { id: 1, title: row.use_case_1_title, description: row.use_case_1_desc },
      { id: 2, title: row.use_case_2_title, description: row.use_case_2_desc },
      { id: 3, title: row.use_case_3_title, description: row.use_case_3_desc },
    ]

    // Aggregate votes per round
    const voteRows = await sql`
      SELECT round,
        SUM(amount_1)::int AS total_1,
        SUM(amount_2)::int AS total_2,
        SUM(amount_3)::int AS total_3,
        COUNT(*)::int       AS participant_count
      FROM votes
      GROUP BY round
      ORDER BY round
    `

    function buildResults(voteRow) {
      if (!voteRow) return null
      const t1 = voteRow.total_1
      const t2 = voteRow.total_2
      const t3 = voteRow.total_3
      const total = t1 + t2 + t3
      return {
        participantCount: voteRow.participant_count,
        amounts: [t1, t2, t3],
        percentages: total > 0
          ? [t1, t2, t3].map(a => Math.round((a / total) * 1000) / 10)
          : [0, 0, 0],
      }
    }

    const round1Row = voteRows.find(r => r.round === 1) || null
    const round2Row = voteRows.find(r => r.round === 2) || null
    const round1Results = buildResults(round1Row)
    const round2Results = buildResults(round2Row)

    // Compute winner (greatest delta R2 - R1) for results_revealed
    let winner = null
    if (row.state === 'results_revealed' && round1Results && round2Results) {
      const deltas = round2Results.amounts.map((a, i) => a - round1Results.amounts[i])
      const maxDelta = Math.max(...deltas)
      const winnerIndices = deltas.reduce((acc, d, i) => {
        if (d === maxDelta) acc.push(i)
        return acc
      }, [])
      winner = { indices: winnerIndices, delta: maxDelta }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ state: row.state, useCases, round1Results, round2Results, winner }),
    }
  } catch (err) {
    console.error('get-state error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error' }),
    }
  }
}
