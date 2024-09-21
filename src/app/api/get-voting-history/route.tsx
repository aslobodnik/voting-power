import { unstable_noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const GOVERNANCE_INDEXER_URL =
  "https://ens-governance-indexer-production.up.railway.app/";

type VoterInfo = {
  proposalIds: Set<string>;
  latestTimestamp: number;
};

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

    const voterAddresses = body.addresses;

    const graphqlQuery = {
      query: `
  {
    votes(where: { voter_in: ${JSON.stringify(voterAddresses)} } limit: 1000) {
      items {
        id
        proposalId
        support
        reason
        voter
        weight
        timestamp
      }
    }
  }
`,
    };
    const response = await fetch(GOVERNANCE_INDEXER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    const dataItems = data.data.votes.items;

    // Group by voter and count unique proposalIds, track latest timestamp
    // Group by voter and count unique proposalIds, track latest timestamp
    const result = dataItems.reduce(
      (acc: Record<string, VoterInfo>, vote: Vote) => {
        if (!acc[vote.voter]) {
          acc[vote.voter] = {
            proposalIds: new Set(),
            latestTimestamp: vote.timestamp,
          };
        }
        acc[vote.voter].proposalIds.add(vote.proposalId);

        // Update latest timestamp if the current vote has a more recent timestamp
        if (vote.timestamp > acc[vote.voter].latestTimestamp) {
          acc[vote.voter].latestTimestamp = vote.timestamp;
        }

        return acc;
      },
      {} as Record<string, VoterInfo>
    );

    // Simpler version of the mapping step
    const counts = Object.entries(result as Record<string, VoterInfo>).map(
      ([voter, voterInfo]) => ({
        voter,
        uniqueProposalCount: voterInfo.proposalIds.size,
        latestTimestamp: voterInfo.latestTimestamp,
      })
    );

    console.log(counts);

    return NextResponse.json({
      message: "Vote data retrieved successfully",
      data: counts,
    });
  } catch (error) {
    console.error("Error fetching vote data:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching vote data" },
      { status: 500 }
    );
  }
}
