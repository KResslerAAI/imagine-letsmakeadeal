import { neon } from '@neondatabase/serverless'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const VALID_STATES = [
  'lobby',
  'round1_open',
  'round1_closed',
  'round1_revealed',
  'round2_open',
  'round2_closed',
  'results_revealed',
]

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

  const { password, action, payload = {} } = body

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  // ── verify ──────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    // ── set_state ──────────────────────────────────────────────────────────────
    if (action === 'set_state') {
      const { state } = payload
      if (!VALID_STATES.includes(state)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid state' }) }
      }
      await sql`
        UPDATE game_state SET state = ${state}, updated_at = NOW() WHERE id = 1
      `
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
    }

    // ── update_config ──────────────────────────────────────────────────────────
    if (action === 'update_config') {
      const { useCases } = payload
      if (!Array.isArray(useCases) || useCases.length !== 3) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Must provide exactly 3 use cases' }) }
      }
      const [uc1, uc2, uc3] = useCases
      await sql`
        UPDATE game_state SET
          use_case_1_title = ${String(uc1.title || '').slice(0, 200)},
          use_case_1_desc  = ${String(uc1.description || '').slice(0, 500)},
          use_case_2_title = ${String(uc2.title || '').slice(0, 200)},
          use_case_2_desc  = ${String(uc2.description || '').slice(0, 500)},
          use_case_3_title = ${String(uc3.title || '').slice(0, 200)},
          use_case_3_desc  = ${String(uc3.description || '').slice(0, 500)},
          updated_at       = NOW()
        WHERE id = 1
      `
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
    }

    // ── reset ──────────────────────────────────────────────────────────────────
    if (action === 'reset') {
      await sql`DELETE FROM votes`
      await sql`UPDATE game_state SET state = 'lobby', updated_at = NOW() WHERE id = 1`
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) }
  } catch (err) {
    console.error('admin error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error' }) }
  }
}
