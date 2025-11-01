import { useEffect, useState } from "react";

import AddressCell from "./AddressCell";

type Activity = {
  activity_type: string;
  amount: number;
  block_timestamp: number;
  delegator_address?: string;
  delegate_address?: string;
  to_delegate?: string;
  from_delegate?: string;
};

function formatNumber(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "m";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toString();
}

function timeAgo(ts: number) {
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60 * 60) return `${Math.floor(diff / 60)} min`;
  if (diff < 60 * 60 * 24) return `${Math.floor(diff / 3600)} hrs`;
  return `${Math.floor(diff / 86400)} days`;
}

export default function RecentActivity({
  onDelegateClick,
}: {
  onDelegateClick?: (address: string) => void;
}) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-recent-activity")
      .then((res) => res.json())
      .then((data) => {
        setActivity(data.data || []);
        setLoading(false);
      });
  }, []);

  const click = (addr: string) =>
    onDelegateClick ? () => onDelegateClick(addr) : undefined;

  return (
    <div className="rounded-lg p-4 w-full h-full max-w-xs mx-auto border border-zinc-800">
      <h2 className="text-zinc-100 text-xl font-bold mb-4">Recent Activity</h2>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700"></div>
        <hr className="border-t border-zinc-700 w-full ml-2" />
      </div>
      {loading ? (
        <ul className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
          {[...Array(15)].map((_, i) => (
            <li key={i} className="flex flex-col text-sm">
              <span className="whitespace-nowrap flex items-center gap-1">
                <span className="h-4 w-24 bg-zinc-700 rounded animate-pulse mr-2" />
                <span className="h-4 w-12 bg-zinc-700 rounded animate-pulse mr-2" />
                <span className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
              </span>
              <span className="h-3 w-20 bg-zinc-800 rounded mt-1 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
          {activity.map((item, i) => {
            const { activity_type: type, amount } = item;

            // Extract main address
            const main =
              type === "delegation_removed"
                ? item.from_delegate
                : type === "delegation_initiated" ||
                    type === "delegation_changed"
                  ? item.to_delegate
                  : type.startsWith("self_") || type === "delegation_to_self"
                    ? item.delegator_address
                    : item.delegate_address;

            if (!main) return null;

            const verb =
              type.includes("removed") || type.includes("sent")
                ? "lost"
                : "gained";

            // Self-delegation cases show special text, others show "due to delegator"
            const selfText =
              type === "self_delegation_initiated"
                ? "initiated self-delegation"
                : type === "delegation_to_self"
                  ? "switched to self-delegation"
                  : type.includes("self_tokens")
                    ? "self-delegated"
                    : null;

            return (
              <li key={i} className="flex flex-col gap-0.5 text-sm">
                <div className="flex items-center gap-1">
                  <AddressCell
                    delegateAddress={main}
                    withLink={false}
                    onClick={click(main)}
                  />
                  <span className="text-zinc-400">{verb}</span>
                  <span
                    className={
                      verb === "gained" ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {formatNumber(amount / 1e18)}
                  </span>
                </div>

                {selfText ? (
                  <span className="text-zinc-400 text-xs">{selfText}</span>
                ) : item.delegator_address ? (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-zinc-400">due to</span>
                    <AddressCell
                      delegateAddress={item.delegator_address}
                      withLink={true}
                    />
                    {type === "delegation_changed" && item.from_delegate && (
                      <>
                        <span className="text-zinc-400">(changed from</span>
                        <AddressCell
                          delegateAddress={item.from_delegate}
                          withLink={false}
                          onClick={click(item.from_delegate)}
                        />
                        <span className="text-zinc-400">)</span>
                      </>
                    )}
                  </div>
                ) : null}

                <span className="text-zinc-500 text-xs">
                  {timeAgo(item.block_timestamp)} ago
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
