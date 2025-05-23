import { useEffect, useState } from "react";
import AddressCell from "./AddressCell";

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

function processActivity(activity: any[]): any[] {
  const grouped: { [block: string]: any[] } = {};
  activity.forEach((item: any) => {
    if (!grouped[item.block_number]) grouped[item.block_number] = [];
    grouped[item.block_number].push(item);
  });

  const results: any[] = [];
  Object.values(grouped).forEach((items: any[]) => {
    items.sort((a: any, b: any) => a.log_index - b.log_index);
    const paired = new Set<number>();
    for (let i = 0; i < items.length - 1; i++) {
      const curr = items[i];
      const next = items[i + 1];
      if (
        curr.voting_power_change < 0 &&
        next.voting_power_change > 0 &&
        Math.abs(curr.voting_power_change) === Math.abs(next.voting_power_change) &&
        next.log_index === curr.log_index + 1
      ) {
        results.push({
          type: "pair",
          from: curr.delegate_address,
          to: next.delegate_address,
          amount: Math.abs(curr.voting_power_change),
          block: curr.block_number,
          timestamp: curr.block_timestamp,
          delegator: curr.delegator || next.delegator
        });
        paired.add(i);
        paired.add(i + 1);
        i++; // skip next
      }
    }
    // Add orphans
    items.forEach((item: any, idx: number) => {
      if (!paired.has(idx)) {
        results.push({
          type: "orphan",
          address: item.delegate_address,
          amount: Math.abs(item.voting_power_change),
          gain: item.voting_power_change > 0,
          block: item.block_number,
          timestamp: item.block_timestamp,
          delegator: item.delegator
        });
      }
    });
  });
  // Sort by timestamp descending
  results.sort((a: any, b: any) => b.timestamp - a.timestamp);
  return results;
}

export default function RecentActivity({ onDelegateClick }: { onDelegateClick?: (address: string) => void }) {
  const [activity, setActivity] = useState<any[]>([]);
  const [displayActivity, setDisplayActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-recent-activity")
      .then((res) => res.json())
      .then((data) => {
        const threshold = 10_000 * 1e18;
        const filtered = (data.data || []).filter((item: any) => Math.abs(item.voting_power_change) >= threshold);
        setActivity(filtered);
        setDisplayActivity(processActivity(filtered));
        setLoading(false);
      });
  }, []);

  return (
    <div className="rounded-lg p-4 w-full h-full max-w-xs mx-auto border border-zinc-800">
      <h2 className="text-zinc-100 text-xl font-bold mb-4">Recent Activity</h2>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700 "></div>
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
          {displayActivity.map((item, i) =>
            item.type === "pair" ? (
              <li key={i} className="flex flex-col text-sm">
                <span className="whitespace-nowrap flex items-center gap-1">
                  <AddressCell delegateAddress={item.to} withLink={false} onClick={onDelegateClick ? () => onDelegateClick(item.to) : undefined} />{' '}
                  <span className="text-zinc-400">gained</span>{' '}
                  <span className="text-emerald-400">{formatNumber(item.amount / 1e18)}</span>{' '}
                </span>
                <div className="flex gap-1">
                  <span className="text-zinc-400">from{' '}</span>
                  <AddressCell delegateAddress={item.from} withLink={false} onClick={onDelegateClick ? () => onDelegateClick(item.from) : undefined} />
                </div>
                {item.delegator && (
                  <span className="text-zinc-400 flex gap-1 text-xs ">
                    <span className="text-zinc-400">Delegator:</span>
                    <AddressCell delegateAddress={item.delegator} withLink={true} />
                  </span>
                )}
                <span className="text-zinc-400 text-xs mt-1">{timeAgo(item.timestamp)} ago</span>
              </li>
            ) : (
              <li key={i} className="flex flex-col text-sm">
                <span className="whitespace-nowrap flex items-center gap-1">
                  <AddressCell delegateAddress={item.address} withLink={false} onClick={onDelegateClick ? () => onDelegateClick(item.address) : undefined} />{' '}
                  <span className="text-zinc-400">{item.gain ? 'gained' : 'lost'}</span>{' '}
                  <span className={item.gain ? 'text-emerald-400' : 'text-red-400'}>{formatNumber(item.amount / 1e18)}</span>
                </span>
                {item.delegator && (
                  <span className="text-zinc-400 flex gap-1 text-xs ">
                    <span className="text-zinc-400">Delegator:</span>
                    <AddressCell delegateAddress={item.delegator} withLink={true} />
                  </span>
                )}
                <span className="text-zinc-400 text-xs mt-1">{timeAgo(item.timestamp)} ago</span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
} 