"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Address } from "viem";

import { ShortenAddress } from "../lib/helpers";
import publicClient from "../lib/publicClient";

export interface ProposerStats {
  proposer: string;
  proposalsCreated: number;
  proposalsPassed: number;
  proposalsDefeated?: number;
  proposalsLive?: number;
  proposalsQueued?: number;
}

function AddressCell({
  onClick,
  delegateAddress,
  withLink,
  proposerStats,
}: {
  delegateAddress: string;
  onClick?: () => void;
  withLink?: boolean;
  proposerStats?: ProposerStats;
}) {
  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEnsName() {
      try {
        const ens = await publicClient.getEnsName({
          address: delegateAddress as Address,
        });
        setEnsName(ens);
      } catch (error) {
        console.error(`Error fetching ENS for ${delegateAddress}:`, error);
      }
    }

    fetchEnsName();
  }, [delegateAddress]);

  const isProposer = proposerStats && proposerStats.proposalsCreated > 0;
  const hasLiveProposals = proposerStats && (proposerStats.proposalsLive || 0) > 0;
  const hasQueuedProposals = proposerStats && (proposerStats.proposalsQueued || 0) > 0;

  // Pass rate only counts completed proposals (passed + defeated)
  const completedProposals = isProposer
    ? proposerStats.proposalsPassed + (proposerStats.proposalsDefeated || 0)
    : 0;
  const passRate = completedProposals > 0
    ? Math.round((proposerStats!.proposalsPassed / completedProposals) * 100)
    : null;

  const content = (
    <span
      onClick={onClick}
      className={`group cursor-pointer items-center flex relative ${
        withLink ? "hover:underline " : ""
      }`}
    >
      {ensName || ShortenAddress(delegateAddress)}
      {isProposer && (
        <>
          <span className="ml-1.5 relative hidden md:inline-block">
            <span className="w-2 h-2 rounded-full bg-ens-blue inline-block" />
            {(hasLiveProposals || hasQueuedProposals) && (
              <span className="absolute inset-0 w-2 h-2 rounded-full bg-ens-blue animate-ping opacity-75" />
            )}
          </span>
          <span className="pointer-events-none absolute left-0 top-full mt-1 px-2.5 py-1.5 bg-zinc-900 text-xs text-zinc-100 rounded whitespace-nowrap z-10 border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-0.5">
            <span className="text-zinc-400">DAO Proposals: {proposerStats.proposalsCreated}</span>
            {passRate !== null && (
              <span>{passRate}% passed ({proposerStats.proposalsPassed}/{completedProposals})</span>
            )}
            {hasLiveProposals && (
              <span className="text-ens-blue">{proposerStats.proposalsLive} voting now</span>
            )}
            {hasQueuedProposals && (
              <span className="text-emerald-400">{proposerStats.proposalsQueued} queued</span>
            )}
          </span>
        </>
      )}
    </span>
  );
  return (
    <>
      {withLink ? (
        <Link
          target="_blank"
          href={`https://etherscan.io/address/${delegateAddress}`}
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </>
  );
}

export default AddressCell;
