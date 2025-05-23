import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  unstable_noStore();
  try {
    const delegate = request.nextUrl.searchParams.get("delegate");
    if (!delegate) {
      return NextResponse.json(
        { error: "Delegate parameter is required" },
        { status: 400 }
      );
    }
    const q = `
          WITH ranked_delegates AS (
            SELECT
              ROW_NUMBER() OVER (ORDER BY SUM(delegator_balance) DESC) as rank,
              delegate,
              SUM(delegator_balance) as total_balance
            FROM 
              current_delegations
            WHERE
              lower(delegate) != '0x0000000000000000000000000000000000000000'
            GROUP BY 
              delegate
          )
          SELECT 
            rank, 
            delegate, 
            total_balance
          FROM 
            ranked_delegates
          WHERE
            lower(delegate)=lower($1)
  `;
    const result = await pool.query(q, [delegate]);

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
