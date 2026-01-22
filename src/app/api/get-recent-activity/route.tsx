import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const thresholdParam = request.nextUrl.searchParams.get("threshold");
    const threshold = thresholdParam ? Number(thresholdParam) : 5e21;

    // Uses pre-computed recent_activity materialized view for ~500x faster queries
    // The view is refreshed by the indexer every 10 minutes
    // Activity types: delegation_initiated, delegation_removed, delegation_changed,
    //   delegation_to_self, self_delegation_initiated, tokens_received_and_delegated,
    //   tokens_received, tokens_sent, self_tokens_received, self_tokens_sent
    const q = `
      SELECT
        block_number,
        block_timestamp,
        activity_type,
        delegator_address,
        amount,
        from_delegate,
        to_delegate,
        delegate_address
      FROM recent_activity
      WHERE amount >= $1
      ORDER BY block_number DESC, log_index DESC;
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
