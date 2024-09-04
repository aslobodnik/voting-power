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
