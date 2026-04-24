import { neon } from '@neondatabase/serverless'

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const password = event.queryStringParameters?.password
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  try {
    const sql = neon(process.env.DATABASE_URL)

    const [stateRow] = await sql`SELECT * FROM game_state WHERE id = 1`
    const votes = await sql`SELECT * FROM votes ORDER BY round, created_at`

    const ucTitles = [
      stateRow.use_case_1_title,
      stateRow.use_case_2_title,
      stateRow.use_case_3_title,
    ]

    const escape = (val) => `"${String(val).replace(/"/g, '""')}"`

    const rows = [
      ['Name', 'Round', ucTitles[0], ucTitles[1], ucTitles[2], 'Timestamp'].map(escape).join(','),
      ...votes.map(v =>
        [
          v.attendee_name,
          v.round,
          v.amount_1,
          v.amount_2,
          v.amount_3,
          new Date(v.created_at).toISOString(),
        ]
          .map(escape)
          .join(',')
      ),
    ]

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="votes-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
      body: rows.join('\r\n'),
    }
  } catch (err) {
    console.error('export error:', err)
    return { statusCode: 500, body: 'Server error' }
  }
}
