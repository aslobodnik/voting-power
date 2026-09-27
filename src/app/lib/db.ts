'server-only'

// Queries run on the Lightsail box through infra-query (Cloudflare Tunnel + Access service token).
// Same `query(text, values)` → `{ rows }` shape as pg's Pool, so callers don't change.

type QueryResult = { rows: any[] }

const DATE_TYPES = new Set([1082, 1114, 1184]) // date, timestamp, timestamptz — pg returns these as Date

function makeClient(database: string) {
  return {
    async query(text: string, values: unknown[] = []): Promise<QueryResult> {
      const res = await fetch(process.env.INFRA_URL as string, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID as string,
          'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET as string,
        },
        body: JSON.stringify({ database, text, values }),
      })
      const body = await res.json().catch(() => ({ error: `bad response (${res.status})` }))
      if (!res.ok) throw new Error(`infra-query ${res.status}: ${body.error}`)
      const dateFields = body.fields
        .filter((f: { dataTypeID: number }) => DATE_TYPES.has(f.dataTypeID))
        .map((f: { name: string }) => f.name)
      if (dateFields.length) {
        for (const row of body.rows) {
          for (const name of dateFields) if (row[name] != null) row[name] = new Date(row[name])
        }
      }
      return { rows: body.rows }
    },
  }
}

export const pool = makeClient(process.env.DB_NAME || 'voting_power')

export const governorPool = makeClient(process.env.GOVERNOR_DB_NAME || 'ens_governor')
