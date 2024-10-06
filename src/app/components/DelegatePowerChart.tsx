"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import useDelegatePowerHistory from "../hooks/useDelegatePowerHistory";

function DelegatePowerChart({ delegateAddress }: { delegateAddress: string }) {
  const { data, error } = useDelegatePowerHistory(delegateAddress);

  if (error) return <div>Error: {error}</div>;
  if (data.length === 0) return <div></div>;

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const generateYTicks = () => {
    const maxVotingPower = Math.max(
      ...data.map((item) => Number(item.voting_power))
    );
    let tickInterval;
    let numTicks = 3; // Adjust this number to change the number of ticks

    if (maxVotingPower <= 1000) {
      tickInterval = Math.ceil(maxVotingPower / numTicks / 100) * 100;
    } else if (maxVotingPower <= 1000000) {
      tickInterval = Math.ceil(maxVotingPower / numTicks / 1000) * 1000;
    } else {
      tickInterval = Math.ceil(maxVotingPower / numTicks / 1000000) * 1000000;
    }

    const ticks = [];
    for (let i = 0; i <= numTicks; i++) {
      ticks.push(i * tickInterval);
    }

    return ticks;
  };

  const formatToken = (value: number) => {
    if (value < 1000) {
      // Below 1000: no decimals
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(value);
    } else if (value < 1000000) {
      // Between 1000 and 1 million: use 'k' suffix
      const thousands = value / 1000;
      return `${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(thousands)}k`;
    } else {
      // 1 million and above: use 'm' suffix with 1 decimal place
      const millions = value / 1000000;
      return `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(millions)}m`;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <XAxis
          dataKey="block_timestamp"
          tickFormatter={formatXAxis}
          type="number"
          ticks={generateTicks()}
          domain={[getStartTimestamp(), getCurrentTimestamp()]}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={formatToken}
          ticks={generateYTicks()}
          domain={[0, "auto"]}
        />
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
          type="stepAfter"
          dataKey="voting_power"
          stroke="#0080BC"
          dot={false}
          isAnimationActive={false}
          yAxisId="right"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Helper function to get the Unix timestamp for Nov 1, 2022
const getStartTimestamp = () => {
  return new Date("2021-11-01").getTime() / 1000;
};

// Helper function to get the current timestamp
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000);
};

// Helper function to generate ticks for every 6 months
const generateTicks = () => {
  const startDate = new Date("2021-11-01");
  const endDate = new Date();
  const ticks = [];

  while (startDate <= endDate) {
    ticks.push(startDate.getTime() / 1000);
    startDate.setMonth(startDate.getMonth() + 8);
  }

  return ticks;
};

export default DelegatePowerChart;
