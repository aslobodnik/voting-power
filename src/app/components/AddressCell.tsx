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
  liveProposalIds?: string[];
  queuedProposalIds?: string[];
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
  const liveProposals = proposerStats?.liveProposalIds || [];
  const queuedProposals = proposerStats?.queuedProposalIds || [];
  const hasActiveProposals = liveProposals.length > 0 || queuedProposals.length > 0;

  // Pass rate only counts completed proposals (passed + defeated)
  const completedProposals = isProposer
    ? proposerStats.proposalsPassed + (proposerStats.proposalsDefeated || 0)
    : 0;
  const passRate = completedProposals > 0
    ? Math.round((proposerStats!.proposalsPassed / completedProposals) * 100)
    : null;

  const proposalUrl = (id: string) => `https://dao.ens.gregskril.com/proposal/${id}`;

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
          <span className={`ml-1.5 w-2 h-2 rounded-full bg-ens-blue hidden md:inline-block ${hasActiveProposals ? 'animate-pulse' : ''}`} />
          <span className="pointer-events-auto absolute left-0 top-full pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <span className="px-2.5 py-1.5 bg-zinc-900 text-xs text-zinc-100 rounded whitespace-nowrap border border-zinc-700 flex flex-col gap-0.5">
            <span className="text-zinc-400">DAO Proposals: {proposerStats.proposalsCreated}</span>
            {passRate !== null && (
              <span>{passRate}% passed ({proposerStats.proposalsPassed}/{completedProposals})</span>
            )}
            {liveProposals.length > 0 && (
              <a
                href={proposalUrl(liveProposals[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ens-blue hover:underline"
              >
                {liveProposals.length} voting now →
              </a>
            )}
            {queuedProposals.length > 0 && (
              <a
                href={proposalUrl(queuedProposals[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                {queuedProposals.length} queued →
              </a>
            )}
            </span>
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
