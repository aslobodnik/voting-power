"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatEther } from "viem";

// Helper function to get the Unix timestamp for Nov 1, 2022
const getStartTimestamp = () => {
  return new Date("2021-11-01").getTime() / 1000;
};

// Helper function to get the current timestamp
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000);
};

// Helper function to generate ticks for every 3 months
const generateTicks = () => {
  const startDate = new Date("2021-11-01");
  const endDate = new Date();
  const ticks = [];

  while (startDate <= endDate) {
    ticks.push(startDate.getTime() / 1000);
    startDate.setMonth(startDate.getMonth() + 3);
  }

  return ticks;
};

async function fetchDelegatePowerHistory(
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

  return data.map((item: any) => ({
    block_timestamp: item.block_timestamp,
    block_number: item.block_number,
    log_index: item.log_index,
    voting_power: Number(formatEther(item.voting_power)),
  }));
}

export default function DelegatePowerHistoryPage() {
  const [data, setData] = useState<DelegatePowerHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  const address = searchParams.get("address") || "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyData = await fetchDelegatePowerHistory(address);
        setData(historyData);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const formatToken = (value: number) => {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Calculate the maximum voting power and add 20%
  const maxVotingPower = Math.max(
    ...data.map((item) => Number(item.voting_power))
  );
  const yAxisMax = (maxVotingPower * 1.2) / 1e18; // Convert to Ether and increase by 20%

  return (
    <div>
      <h1>Delegate Power History</h1>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <XAxis
            dataKey="block_timestamp"
            tickFormatter={formatXAxis}
            type="number"
            ticks={generateTicks()}
            domain={[getStartTimestamp(), getCurrentTimestamp()]}
          />
          <YAxis tickFormatter={formatToken} domain={[0, "auto"]} />
          <Tooltip
            labelFormatter={(value) => {
              const date = new Date(value * 1000);
              return `Date: ${date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}`;
            }}
            formatter={(value: number) => [formatToken(value), "Voting Power"]}
            contentStyle={{
              backgroundColor: "#E7E5E4",
              border: "1px solid #cccccc",
            }}
            labelStyle={{ color: "black" }}
            itemStyle={{ color: "#0080BC" }}
          />
          <Line
            type="monotone"
            dataKey="voting_power"
            stroke="#0080BC"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
