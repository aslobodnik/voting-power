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
}: {
  delegateAddress: string;
  onClick?: () => void;
  withLink?: boolean;
  onChainVotes?: number;
}) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const bgColor =
    onChainVotes === undefined
      ? "bg-red-400"
      : onChainVotes > 10
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
      className={`cursor-pointer items-center flex ${
        withLink ? "hover:underline" : ""
      }`}
    >
      {ensName || ShortenAddress(delegateAddress)}
      <div className={`h-2 w-2 ml-2 ${bgColor}`}></div>
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
