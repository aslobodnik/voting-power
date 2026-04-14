import { unstable_noStore } from "next/cache";

import HomeClient from "./HomeClient";
import { pool } from "./lib/db";

export default async function Home() {
  unstable_noStore();

  let initialDelegates: Delegate[] = [];
  let initialUpdatedAt = "";
  let initialVotableSupply = 0;
  let initialError: string | null = null;

  const topDelegatesQuery = `
    SELECT
      rank,
      delegate_address,
      voting_power,
      voting_power_30d_ago,
      delegations,
      non_zero_delegations
    FROM top_100_delegates
    ORDER BY voting_power DESC
    LIMIT 100;
  `;

  const updatedAtQuery = `
    SELECT block_timestamp FROM events
    WHERE block_number = (SELECT MAX(block_number) FROM events);
  `;

  const votableSupplyQuery = `
    select sum(voting_power) as votable_supply from current_delegate_power;
  `;

  try {
    const [delegatesResult, updatedAtResult, votableSupplyResult] =
      await Promise.all([
        pool.query(topDelegatesQuery),
        pool.query(updatedAtQuery),
        pool.query(votableSupplyQuery),
      ]);

    initialDelegates = delegatesResult.rows as Delegate[];
    initialUpdatedAt =
      updatedAtResult.rows.length > 0
        ? String(updatedAtResult.rows[0].block_timestamp)
        : "";
    initialVotableSupply =
      votableSupplyResult.rows.length > 0
        ? Number(votableSupplyResult.rows[0].votable_supply)
        : 0;
  } catch (error) {
    console.error("Database query error (home page):", error);
    initialError = "There was a problem fetching the data.";
  }

  return (
    <HomeClient
      initialDelegates={initialDelegates}
      initialUpdatedAt={initialUpdatedAt}
      initialVotableSupply={initialVotableSupply}
      initialError={initialError}
    />
  );
}
