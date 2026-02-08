import { useEffect, useState } from "react";

import AddressCell from "./AddressCell";
import Pagination from "./Pagination";

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
  compact = false,
}: {
  onDelegateClick?: (address: string) => void;
  compact?: boolean;
}) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

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

  const totalPages = Math.ceil(activity.length / rowsPerPage);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when activity data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activity]);

  // Compact mode (mobile) - with pagination
  if (compact) {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentData = activity.slice(startIndex, endIndex);

    return (
      <>
        <ul className="flex flex-col">
          {loading ? (
            [...Array(rowsPerPage)].map((_, i) => (
              <li key={i} className="flex flex-col gap-0.5 text-sm py-3 border-b border-zinc-700">
                <div className="flex items-center gap-1">
                  <span className="h-4 w-24 bg-zinc-700 rounded animate-pulse" />
                  <span className="h-4 w-12 bg-zinc-700 rounded animate-pulse" />
                  <span className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              </li>
            ))
          ) : (
            <>
              {currentData.map((item, i) => {
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

                const timeText = `${timeAgo(item.block_timestamp)} ago`;

                return (
                  <li key={i} className="flex flex-col gap-0.5 text-sm py-3 border-b border-zinc-700">
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

                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      {selfText ? (
                        <>
                          <span>{selfText}</span>
                          <span>•</span>
                          <span className="text-zinc-500">{timeText}</span>
                        </>
                      ) : item.delegator_address ? (
                        <>
                          <span>due to</span>
                          <AddressCell
                            delegateAddress={item.delegator_address}
                            withLink={true}
                          />
                          {type === "delegation_changed" && item.from_delegate && (
                            <>
                              <span>(from</span>
                              <AddressCell
                                delegateAddress={item.from_delegate}
                                withLink={false}
                                onClick={click(item.from_delegate)}
                              />
                              <span>)</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-zinc-500">{timeText}</span>
                        </>
                      ) : (
                        <span className="text-zinc-500">{timeText}</span>
                      )}
                    </div>
                  </li>
                );
              })}
              {/* Placeholder rows to maintain consistent height */}
              {Array.from(
                { length: Math.max(rowsPerPage - currentData.length, 0) },
                (_, index) => (
                  <li key={`placeholder-${index}`} className="text-sm py-3 border-b border-zinc-700">
                    <div className="flex items-center gap-1">
                      <span>&nbsp;</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span>&nbsp;</span>
                    </div>
                  </li>
                )
              )}
            </>
          )}
        </ul>
        <div className="mt-4 flex justify-between items-center text-zinc-400">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </>
    );
  }

  // Desktop mode (full) - with scrolling, keep existing 3-line format
  const activityList = (
    <ul className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
      {loading ? (
        [...Array(15)].map((_, i) => (
          <li key={i} className="flex flex-col text-sm">
            <span className="whitespace-nowrap flex items-center gap-1">
              <span className="h-4 w-24 bg-zinc-700 rounded animate-pulse mr-2" />
              <span className="h-4 w-12 bg-zinc-700 rounded animate-pulse mr-2" />
              <span className="h-4 w-16 bg-zinc-700 rounded animate-pulse" />
            </span>
            <span className="h-3 w-20 bg-zinc-800 rounded mt-1 animate-pulse" />
          </li>
        ))
      ) : (
        activity.map((item, i) => {
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
                <div className="text-xs">
                  {type === "delegation_changed" && item.from_delegate && (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">from</span>
                      <AddressCell
                        delegateAddress={item.from_delegate}
                        withLink={false}
                        onClick={click(item.from_delegate)}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-400">due to</span>
                    <AddressCell
                      delegateAddress={item.delegator_address}
                      withLink={true}
                    />
                  </div>
                </div>
              ) : null}

              <span className="text-zinc-500 text-xs">
                {timeAgo(item.block_timestamp)} ago
              </span>
            </li>
          );
        })
      )}
    </ul>
  );

  return (
    <div className="rounded-lg p-4 w-full h-full max-w-xs mx-auto border border-zinc-800">
      <h2 className="text-zinc-100 text-xl font-bold mb-4">Recent Activity</h2>
      <div className="flex items-center mb-4">
        <div className="w-[7px] h-[7px] bg-zinc-700"></div>
        <hr className="border-t border-zinc-700 w-full ml-2" />
      </div>
      {activityList}
    </div>
  );
}
