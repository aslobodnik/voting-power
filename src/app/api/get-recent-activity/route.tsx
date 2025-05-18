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
    p.delegate_address,
    p.block_number,
    p.block_timestamp,
    p.log_index,
    p.voting_power,
    LAG(p.voting_power,1,0)
      OVER (PARTITION BY p.delegate_address
            ORDER BY p.block_number, p.log_index)
      AS previous_power
  FROM delegate_power p
),
with_change AS (
  SELECT
    *,
    COALESCE(voting_power - previous_power, voting_power)
      AS voting_power_change
  FROM with_lag
)
SELECT
  c.*,
  dc.args->>'delegator' AS delegator
FROM with_change c
LEFT JOIN events dc
  ON dc.event_type   = 'DelegateChanged'
 AND dc.block_number = c.block_number
 AND dc.log_index    = c.log_index - 1
 -- only grab the row where this delegate was involved:
 AND (
       dc.args->>'toDelegate'   = c.delegate_address
    OR dc.args->>'fromDelegate' = c.delegate_address
    )
WHERE
  abs(voting_power_change) >= $1
  AND c.block_timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '60 days')
ORDER BY
  c.block_number DESC,
  c.log_index DESC;
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
