import { useEffect, useState } from "react";
import { fetchDelegators } from "../lib/client-api";

function useDelegators(delegateAddress: string, hideZeroBalances: boolean) {
  const [delegators, setDelegators] = useState<Delegator[]>([]);
  const [votingPower, setVotingPower] = useState<bigint>(0n);
  const [delegations, setDelegations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDelegatorsData = async () => {
      if (!delegateAddress) {
        setDelegators([]);
        setVotingPower(0n);
        setDelegations(0);
        return;
      }

      setIsLoading(true);
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
      } catch (error) {
        console.error("Error fetching delegators:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDelegatorsData();
  }, [delegateAddress, hideZeroBalances]);

  return { delegators, votingPower, delegations, isLoading };
}
export default useDelegators;
