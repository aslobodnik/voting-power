import { unstable_noStore } from "next/cache";

import { pool } from "../lib/db";
import { HoldersTable } from "./HoldersTable.client";

export default async function Holders() {
  unstable_noStore();

  let rows: Holder[] = [];
  let errorMessage: string | null = null;
  try {
    const q = `
      select * from top_1000_holders order by balance desc;
    `;
    const result = await pool.query(q);
    rows = result.rows as Holder[];
  } catch (error) {
    console.error("Database query error (holders page):", error);
    errorMessage = "There was a problem fetching the data.";
  }

  return <HoldersTable initialData={rows} error={errorMessage} />;
}
