"use client";
import { useEffect, useState } from "react";
import publicClient from "../lib/publicClient";
import { Address } from "viem";
import { ShortenAddress } from "../lib/helpers";
import Link from "next/link";

function AddressCell({
  onClick,
  delegateAddress,
  withLink,
  onChainVotes,
  withVotes,
}: {
  delegateAddress: string;
  onClick?: () => void;
  withLink?: boolean;
  onChainVotes?: number;
  withVotes?: boolean;
}) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const bgColor =
    onChainVotes === undefined
      ? "bg-red-400"
      : onChainVotes > 19
      ? "bg-ens-blue"
      : onChainVotes >= 1
      ? "bg-yellow-300"
      : "bg-red-400";

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
  const content = (
    <span
      onClick={onClick}
      className={`cursor-pointer group items-center flex ${
        withLink ? "hover:underline" : ""
      }`}
    >
      {withVotes && (
        <div
          className={`h-2 mt-[1px] text-[6px] text-zinc-950 text-center w-2 mr-2 ${bgColor}`}
        >
          <span className="invisible group-hover:visible transition-opacity duration-1000 opacity-0 group-hover:opacity-100">
            {onChainVotes}
          </span>
        </div>
      )}
      {ensName || ShortenAddress(delegateAddress)}
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
