import { useState, useEffect } from "react";
import { fetchDelegatePowerHistory } from "../lib/client-api";

function useDelegatePowerHistory(delegateAddress: string) {
  const [data, setData] = useState<DelegatePowerHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyData = await fetchDelegatePowerHistory(delegateAddress);
        setData(historyData);
        setError(null);
      } catch (err) {
        console.error("Error fetching delegate power history:", err);
        setError("Failed to fetch data");
        setData([]);
      }
    };

    if (delegateAddress) {
      fetchData();
    } else {
      setData([]);
      setError(null);
    }
  }, [delegateAddress]);

  return { data, error };
}

export default useDelegatePowerHistory;
