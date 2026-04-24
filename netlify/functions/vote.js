import { neon } from '@neondatabase/serverless'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { attendeeId, attendeeName, round, amounts } = body

  // Validate inputs
  if (
    typeof attendeeId !== 'string' || !attendeeId.trim() ||
    typeof attendeeName !== 'string' || !attendeeName.trim() ||
    ![1, 2].includes(round) ||
    !Array.isArray(amounts) || amounts.length !== 3
  ) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) }
  }

  const [a1, a2, a3] = amounts.map(n => Math.round(Number(n)))
  if (
    isNaN(a1) || isNaN(a2) || isNaN(a3) ||
    a1 < 0 || a2 < 0 || a3 < 0 ||
    a1 + a2 + a3 !== 300000
  ) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Amounts must sum to $300,000' }) }
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // Verify voting is open for this round
    const [stateRow] = await sql`SELECT state FROM game_state WHERE id = 1`
    const allowedState = round === 1 ? 'round1_open' : 'round2_open'
    if (stateRow.state !== allowedState) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Voting is not currently open for this round' }),
      }
    }

    // Insert; silently ignore duplicate votes from same device
    await sql`
      INSERT INTO votes (attendee_id, attendee_name, round, amount_1, amount_2, amount_3)
      VALUES (
        ${attendeeId.trim()},
        ${attendeeName.trim().slice(0, 100)},
        ${round},
        ${a1}, ${a2}, ${a3}
      )
      ON CONFLICT ON CONSTRAINT unique_vote DO NOTHING
    `

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('vote error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) }
  }
}
