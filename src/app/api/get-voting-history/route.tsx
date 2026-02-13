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

    const [result, totalResult] = await Promise.all([
      governorPool.query(
        `SELECT
          LOWER(voter) as voter,
          COUNT(DISTINCT proposal_id) as unique_proposal_count,
          COUNT(DISTINCT proposal_id) FILTER (WHERE support = 1) as votes_for,
          COUNT(DISTINCT proposal_id) FILTER (WHERE support = 0) as votes_against,
          COUNT(DISTINCT proposal_id) FILTER (WHERE support = 2) as votes_abstain,
          MAX(block_timestamp) as latest_timestamp
        FROM votes
        WHERE LOWER(voter) = ANY($1)
        GROUP BY LOWER(voter)`,
        [addresses]
      ),
      governorPool.query(
        `SELECT COUNT(DISTINCT proposal_id) as total_proposals FROM proposals`
      ),
    ]);

    const totalProposals = Number(totalResult.rows[0].total_proposals);

    const counts = result.rows.map((row) => ({
      voter: row.voter,
      uniqueProposalCount: Number(row.unique_proposal_count),
      votesFor: Number(row.votes_for),
      votesAgainst: Number(row.votes_against),
      votesAbstain: Number(row.votes_abstain),
      latestTimestamp: row.latest_timestamp,
    }));

    return NextResponse.json({
      message: "Vote data retrieved successfully",
      data: counts,
      totalProposals,
    });
  } catch (error) {
    console.error("Error fetching vote data:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching vote data" },
      { status: 500 }
    );
  }
}
