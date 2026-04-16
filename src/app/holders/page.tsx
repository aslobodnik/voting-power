import { unstable_noStore } from "next/cache";

import { pool } from "../lib/db";
import { HoldersTable } from "./HoldersTable.client";

export default async function Holders() {
  unstable_noStore();

  let rows: Holder[] = [];
  let errorMessage: string | null = null;
  try {
    const q = `
      SELECT
        h.address,
        h.balance,
        h.rank,
        h.balance_30d_ago,
        CASE
          WHEN lower(cd.delegate) = '0x0000000000000000000000000000000000000000'
            THEN NULL
          ELSE cd.delegate
        END AS delegate
      FROM top_1000_holders h
      LEFT JOIN current_delegations cd
        ON lower(cd.delegator) = lower(h.address)
      ORDER BY h.balance DESC;
    `;
    const result = await pool.query(q);
    rows = result.rows as Holder[];
  } catch (error) {
    console.error("Database query error (holders page):", error);
    errorMessage = "There was a problem fetching the data.";
  }

  return <HoldersTable initialData={rows} error={errorMessage} />;
}
