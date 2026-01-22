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
        LOWER(p.proposer) as proposer,
        COUNT(DISTINCT p.proposal_id) as proposals_created,
        COUNT(DISTINCT CASE WHEN pl.event_type = 'executed' THEN p.proposal_id END) as proposals_passed
      FROM proposals p
      LEFT JOIN proposal_lifecycle pl ON p.proposal_id = pl.proposal_id
      WHERE LOWER(p.proposer) = ANY($1)
      GROUP BY LOWER(p.proposer)`,
      [addresses]
    );

    const stats = result.rows.map((row) => ({
      proposer: row.proposer,
      proposalsCreated: Number(row.proposals_created),
      proposalsPassed: Number(row.proposals_passed),
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
