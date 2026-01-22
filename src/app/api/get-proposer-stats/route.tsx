import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { governorPool } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  unstable_noStore();
  try {
    const body = await request.json();
    if (!body.addresses || !Array.isArray(body.addresses)) {
      return NextResponse.json(
        { error: "Invalid input: addresses must be provided as an array" },
        { status: 400 }
      );
    }

    const addresses = body.addresses.map((a: string) => a.toLowerCase());

    const result = await governorPool.query(
      `SELECT
        LOWER(proposer) as proposer,
        COUNT(*) as proposals_created,
        SUM(array_length(targets, 1)) as total_executables
      FROM proposals
      WHERE LOWER(proposer) = ANY($1)
      GROUP BY LOWER(proposer)`,
      [addresses]
    );

    const stats = result.rows.map((row) => ({
      proposer: row.proposer,
      proposalsCreated: Number(row.proposals_created),
      totalExecutables: Number(row.total_executables),
    }));

    return NextResponse.json({
      message: "Proposer stats retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching proposer stats:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching proposer stats" },
      { status: 500 }
    );
  }
}
