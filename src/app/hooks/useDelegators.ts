import { useEffect, useState } from "react";
import { fetchDelegators } from "../lib/client-api";

function useDelegators(delegateAddress: string, hideZeroBalances: boolean) {
  const [delegators, setDelegators] = useState<Delegator[]>([]);
  const [votingPower, setVotingPower] = useState<bigint>(0n);
  const [delegations, setDelegations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDelegatorsData = async () => {
      if (!delegateAddress) {
        setDelegators([]);
        setVotingPower(0n);
        setDelegations(0);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchDelegators(delegateAddress);
        const totalTokens = data.reduce(
          (sum, d) => sum + BigInt(d.delegator_tokens),
          0n
        );
        const filteredData = hideZeroBalances
          ? data.filter((d) => d.delegator_tokens >= 1000000000000000000n)
          : data;

        setVotingPower(totalTokens);
        setDelegators(filteredData);
        setDelegations(filteredData.length);
      } catch (e) {
        console.error("Error fetching delegators:", e);
        setDelegators([]);
        setVotingPower(0n);
        setDelegations(0);
        setError(e instanceof Error ? e.message : "Failed to fetch delegators");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDelegatorsData();
  }, [delegateAddress, hideZeroBalances]);

  return { delegators, votingPower, delegations, isLoading, error };
}
export default useDelegators;
