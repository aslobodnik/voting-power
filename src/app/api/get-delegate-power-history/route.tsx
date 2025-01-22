import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/app/lib/db";

export const dynamic = "force-dynamic";

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
      select
        block_timestamp,
        block_number,
        log_index,
        voting_power
      from
        delegate_power
      where
        lower(delegate_address)=lower($1)
      order by
        block_number desc,
        log_index desc;
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
