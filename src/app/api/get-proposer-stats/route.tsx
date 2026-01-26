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

    // Get current block to determine live proposals
    const blockResult = await governorPool.query(
      `SELECT COALESCE(MAX(block_number), 0) as current_block FROM votes`
    );
    const currentBlock = Number(blockResult.rows[0].current_block);

    const result = await governorPool.query(
      `WITH proposal_status AS (
        SELECT
          p.proposal_id,
          p.proposer,
          p.end_block,
          MAX(CASE WHEN pl.event_type = 'executed' THEN 1 ELSE 0 END) as is_executed,
          MAX(CASE WHEN pl.event_type = 'queued' THEN 1 ELSE 0 END) as is_queued,
          MAX(CASE WHEN pl.event_type = 'canceled' THEN 1 ELSE 0 END) as is_canceled
        FROM proposals p
        LEFT JOIN proposal_lifecycle pl ON p.proposal_id = pl.proposal_id
        WHERE LOWER(p.proposer) = ANY($1)
        GROUP BY p.proposal_id, p.proposer, p.end_block
      )
      SELECT
        LOWER(proposer) as proposer,
        COUNT(*) as proposals_created,
        COUNT(CASE WHEN is_executed = 1 THEN 1 END) as proposals_passed,
        COUNT(CASE WHEN is_executed = 0 AND is_canceled = 0 AND end_block < $2 THEN 1 END) as proposals_defeated,
        COUNT(CASE WHEN is_executed = 0 AND is_canceled = 0 AND is_queued = 0 AND end_block >= $2 THEN 1 END) as proposals_live,
        COUNT(CASE WHEN is_queued = 1 AND is_executed = 0 THEN 1 END) as proposals_queued
      FROM proposal_status
      GROUP BY LOWER(proposer)`,
      [addresses, currentBlock]
    );

    const stats = result.rows.map((row) => ({
      proposer: row.proposer,
      proposalsCreated: Number(row.proposals_created),
      proposalsPassed: Number(row.proposals_passed),
      proposalsDefeated: Number(row.proposals_defeated),
      proposalsLive: Number(row.proposals_live),
      proposalsQueued: Number(row.proposals_queued),
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
