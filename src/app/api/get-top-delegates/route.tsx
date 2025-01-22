import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const q = `
          SELECT 
            rank,
            delegate_address,
            voting_power,
            voting_power_30d_ago,  
            delegations,
            non_zero_delegations
        FROM 
            top_100_delegates
        ORDER BY
            voting_power DESC
        LIMIT 100;
  `;
    const result = await pool.query(q);

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
