import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const thresholdParam = request.nextUrl.searchParams.get("threshold");
    const threshold = thresholdParam ? Number(thresholdParam) : 10e20;
    const q = `
          WITH with_lag AS (
  SELECT
    delegate_address,
    block_number,
    block_timestamp,
    log_index,
    voting_power,
    LAG(voting_power, 1, 0) OVER (
      PARTITION BY delegate_address ORDER BY block_number, log_index
    ) AS previous_power
  FROM delegate_power
),
with_change AS (
  SELECT *,
    COALESCE(voting_power - previous_power, voting_power) AS voting_power_change
  FROM with_lag
)
SELECT *
FROM with_change
WHERE block_timestamp >= (EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days'))
and abs(voting_power_change) >= $1
ORDER BY block_number desc;
  `;
    const result = await pool.query(q, [threshold]);

    const json = {
      message: "Data retrieved successfully",
      data: result.rows,
    };

    return NextResponse.json(json);
  } catch (error) {
    console.error("Database query error:", error);
    return NextResponse.json(
      { error: "An error occurred while querying the database" },
      { status: 500 }
    );
  }
}
