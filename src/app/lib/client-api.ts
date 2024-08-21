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
