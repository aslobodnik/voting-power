import { useEffect, useState } from "react";

import AddressCell from "./AddressCell";

// ============================================================================
// TYPES
// ============================================================================

type Activity = {
  activity_type: string;
  amount: number;
  block_timestamp: number;
  delegator_address?: string;
  delegate_address?: string;
  to_delegate?: string;
  from_delegate?: string;
};

// ============================================================================
// UTILITIES
// ============================================================================

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

// ============================================================================
// ACTIVITY ROW COMPONENT
// ============================================================================

type ActivityRowProps = {
  // Line 1: main address + verb + amount
  mainAddress: string;
  mainOnClick?: () => void;
  verb: "gained" | "lost" | "bought" | "sold";
  amount: number;
  positive: boolean; // true = green, false = red

  // Line 2 (optional): can be simple text, or address + text, or address + text + from address
  secondaryText?: string; // Simple text like "self-delegated"
  secondaryAddress?: string; // Address to show
  secondaryAddressLink?: boolean; // Whether secondary address is a link
  secondaryLabel?: string; // Label after secondary address like "bought", "new"

  // Line 2 extended (for delegation_changed): "changed from" + address
  fromAddress?: string;
  fromOnClick?: () => void;

  // Timestamp
  timestamp: number;
};

function ActivityRow({
  mainAddress,
  mainOnClick,
  verb,
  amount,
  positive,
  secondaryText,
  secondaryAddress,
  secondaryAddressLink,
  secondaryLabel,
  fromAddress,
  fromOnClick,
  timestamp,
}: ActivityRowProps) {
  return (
    <li className="flex flex-col gap-0.5 text-sm">
      {/* Line 1: main address + verb + amount */}
      <div className="flex items-center gap-1">
        <AddressCell
          delegateAddress={mainAddress}
          withLink={false}
          onClick={mainOnClick}
        />
        <span className="text-zinc-400">{verb}</span>
        <span className={positive ? "text-emerald-400" : "text-red-400"}>
          {formatNumber(amount / 1e18)}
        </span>
      </div>

      {/* Line 2: secondary info */}
      {secondaryText && (
        <span className="text-zinc-400 text-xs">{secondaryText}</span>
      )}

      {secondaryAddress && (
        <div className="flex items-center gap-1 text-xs">
          <AddressCell
            delegateAddress={secondaryAddress}
            withLink={secondaryAddressLink ?? true}
          />
          {secondaryLabel && (
            <span className="text-zinc-400">{secondaryLabel}</span>
          )}
          {fromAddress && (
            <>
              <span className="text-zinc-400">changed from</span>
              <AddressCell
                delegateAddress={fromAddress}
                withLink={false}
                onClick={fromOnClick}
              />
            </>
          )}
        </div>
      )}

      {/* Timestamp */}
      <span className="text-zinc-500 text-xs">{timeAgo(timestamp)} ago</span>
    </li>
  );
}

// ============================================================================
// CONFIGURATION MAP
// ============================================================================

// Verb + sentiment constants
const GAIN = { verb: "gained" as const, positive: true };
const LOSS = { verb: "lost" as const, positive: false };
const BUY = { verb: "bought" as const, positive: true };
const SELL = { verb: "sold" as const, positive: false };

// Helper to build ActivityRowProps with shorter syntax
function makeActivity({
  main,
  verb,
  amount,
  positive,
  ts,
  secondary,
  label,
  text,
  from,
}: {
  main: string;
  verb: ActivityRowProps["verb"];
  amount: number;
  positive: boolean;
  ts: number;
  secondary?: string;
  label?: string;
  text?: string;
  from?: string;
}): ActivityRowProps {
  return {
    mainAddress: main,
    verb,
    amount,
    positive,
    secondaryAddress: secondary,
    secondaryLabel: label,
    secondaryText: text,
    fromAddress: from,
    timestamp: ts,
  };
}

// Shared patterns
const newDelegator = (i: Activity, main: string) =>
  makeActivity({
    main,
    ...GAIN,
    amount: i.amount,
    ts: i.block_timestamp,
    secondary: i.delegator_address,
    label: "new",
  });

const selfDelegated = (
  i: Activity,
  main: string,
  action: typeof BUY | typeof SELL
) =>
  makeActivity({
    main,
    ...action,
    amount: i.amount,
    ts: i.block_timestamp,
    text: "self-delegated",
  });

const tokenMovement = (
  i: Activity,
  main: string,
  action: typeof GAIN | typeof LOSS,
  label: string
) =>
  makeActivity({
    main,
    ...action,
    amount: i.amount,
    ts: i.block_timestamp,
    secondary: i.delegator_address,
    label,
  });

type ActivityConfig = {
  [key: string]: (i: Activity) => ActivityRowProps | null;
};

const activityConfig: ActivityConfig = {
  // DELEGATION EVENTS
  self_delegation_initiated: (i) =>
    i.delegator_address
      ? makeActivity({
          main: i.delegator_address,
          ...GAIN,
          amount: i.amount,
          ts: i.block_timestamp,
          text: "initiated self-delegation",
        })
      : null,

  delegation_initiated: (i) =>
    i.to_delegate ? newDelegator(i, i.to_delegate) : null,

  delegation_removed: (i) =>
    i.from_delegate
      ? makeActivity({
          main: i.from_delegate,
          ...LOSS,
          amount: i.amount,
          ts: i.block_timestamp,
          secondary: i.delegator_address,
          label: "delegation removed",
        })
      : null,

  delegation_to_self: (i) =>
    i.delegator_address
      ? makeActivity({
          main: i.delegator_address,
          ...GAIN,
          amount: i.amount,
          ts: i.block_timestamp,
          text: "switched to self-delegation",
        })
      : null,

  delegation_changed: (i) =>
    i.to_delegate && i.from_delegate
      ? makeActivity({
          main: i.to_delegate,
          ...GAIN,
          amount: i.amount,
          ts: i.block_timestamp,
          secondary: i.delegator_address,
          from: i.from_delegate,
        })
      : null,

  // TOKEN MOVEMENT EVENTS
  tokens_received_and_delegated: (i) =>
    i.delegate_address ? newDelegator(i, i.delegate_address) : null,

  self_tokens_received: (i) =>
    i.delegate_address ? selfDelegated(i, i.delegate_address, BUY) : null,

  self_tokens_sent: (i) =>
    i.delegate_address ? selfDelegated(i, i.delegate_address, SELL) : null,

  tokens_received: (i) =>
    i.delegate_address
      ? tokenMovement(i, i.delegate_address, GAIN, "bought")
      : null,

  tokens_sent: (i) =>
    i.delegate_address
      ? tokenMovement(i, i.delegate_address, LOSS, "sold")
      : null,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
        // Backend already filters and processes everything
        setActivity(data.data || []);
        setLoading(false);
      });
  }, []);

  // Helper to create onClick handler for delegates
  const handleDelegateClick = (address: string) =>
    onDelegateClick ? () => onDelegateClick(address) : undefined;

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
          {activity.map((item, i) => {
            // Get configuration for this activity type
            const configFn = activityConfig[item.activity_type];
            if (!configFn) return null;

            // Generate props from config
            const props = configFn(item);
            if (!props) return null;

            // Add onClick handlers for main and from addresses
            return (
              <ActivityRow
                key={i}
                {...props}
                mainOnClick={handleDelegateClick(props.mainAddress)}
                fromOnClick={
                  props.fromAddress
                    ? handleDelegateClick(props.fromAddress)
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
