"use client";
export async function fetchDelegators(
  delegateAddress: string
): Promise<Delegator[]> {
  const response = await fetch(
    `/api/get-delegators?delegate=${encodeURIComponent(delegateAddress)}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const { data } = await response.json();
  return data;
}

export async function fetchTopDelegates(): Promise<Delegate[]> {
  const response = await fetch("/api/get-top-delegates");
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const { data } = await response.json();
  return data;
}

export async function fetchVotingHistory(
  addresses: string[]
): Promise<VoteData[]> {
  const response = await fetch("/api/get-voting-history", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ addresses }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const { data } = await response.json();
  return data;
}
export async function fetchUpdatedAt(): Promise<string> {
  const response = await fetch("/api/get-updated-at");
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const { data } = await response.json();
  return data[0].block_timestamp;
}

export async function fetchDelegateRank(
  delegateAddress: string
): Promise<string> {
  const response = await fetch(
    `/api/get-delegate-rank?delegate=${encodeURIComponent(delegateAddress)}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const { data } = await response.json();
  return data[0].rank;
}

export async function fetchDelegatePowerHistory(
  delegateAddress: string
): Promise<DelegatePowerHistory[]> {
  const response = await fetch(
    `/api/get-delegate-power-history?delegate=${encodeURIComponent(
      delegateAddress
    )}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const { data } = await response.json();

  return data.map((item: DelegatePowerHistory) => ({
    ...item,
    block_timestamp: item.block_timestamp,
    block_number: item.block_number,
    voting_power: item.voting_power,
  }));
}
