"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Address } from "viem";

import { ShortenAddress } from "../lib/helpers";
import publicClient from "../lib/publicClient";

export interface ProposerStats {
  proposer: string;
  proposalsCreated: number;
  proposalsPassed: number;
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
  const passRate = isProposer
    ? Math.round((proposerStats.proposalsPassed / proposerStats.proposalsCreated) * 100)
    : 0;

  const content = (
    <span
      onClick={onClick}
      className={`group cursor-pointer items-center flex relative ${
        withLink ? "hover:underline " : ""
      }`}
    >
      {ensName || ShortenAddress(delegateAddress)}
      {isProposer && (
        <span className="relative ml-1.5 hidden md:inline-block group/badge">
          <Image
            src="/icon_proposer.svg"
            alt="DAO Proposer"
            width={20}
            height={20}
            className="transition-transform duration-500 ease-out group-hover/badge:scale-[5] group-hover/badge:translate-x-8 group-hover/badge:translate-y-[-40px] relative z-20"
          />
          <span className="pointer-events-none absolute left-0 top-full mt-12 px-2 py-1 bg-zinc-900 text-xs text-zinc-100 rounded whitespace-nowrap z-10 border border-zinc-700 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-500">
            DAO Proposals Created: {proposerStats.proposalsCreated} | {passRate}% passed
          </span>
        </span>
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
