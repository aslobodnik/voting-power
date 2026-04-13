import { useState, useEffect } from "react";
import { fetchDelegatePowerHistory } from "../lib/client-api";

function useDelegatePowerHistory(delegateAddress: string) {
  const [data, setData] = useState<DelegatePowerHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const historyData = await fetchDelegatePowerHistory(delegateAddress);
        setData(historyData);
        setError(null);
      } catch (err) {
        console.error("Error fetching delegate power history:", err);
        setError("Failed to fetch data");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (delegateAddress) {
      fetchData();
    } else {
      setData([]);
      setError(null);
      setIsLoading(false);
    }
  }, [delegateAddress]);

  return { data, error, isLoading };
}

export default useDelegatePowerHistory;
