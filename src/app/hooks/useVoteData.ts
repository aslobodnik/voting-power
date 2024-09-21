import { useState, useEffect } from "react";
import { fetchVotingHistory } from "../lib/client-api";

function useVoteData(delegates: Delegate[]) {
  const [voteData, setVoteData] = useState<VoteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      if (delegates.length === 0) return;

      setIsLoading(true);
      setError(null);

      const voterAddresses = delegates.map(
        (delegate) => delegate.delegate_address
      );

      try {
        const votes = await fetchVotingHistory(voterAddresses);
        setVoteData(votes);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`There was a problem fetching vote data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();
  }, [delegates]);

  return { voteData, isLoading, error };
}

export default useVoteData;
