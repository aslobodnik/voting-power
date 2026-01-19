'server-only'

import { Pool } from 'pg'

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT as unknown as number,
  password: process.env.DB_PASSWORD,
})

export const governorPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.GOVERNOR_DB_NAME,
  port: process.env.DB_PORT as unknown as number,
  password: process.env.DB_PASSWORD,
})
