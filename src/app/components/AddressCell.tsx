"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Address } from "viem";

import { ShortenAddress } from "../lib/helpers";
import publicClient from "../lib/publicClient";

function AddressCell({
  onClick,
  delegateAddress,
  withLink,
}: {
  delegateAddress: string;
  onClick?: () => void;
  withLink?: boolean;
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
  const content = (
    <span
      onClick={onClick}
      className={`group cursor-pointer items-center flex ${
        withLink ? "hover:underline " : ""
      }`}
    >
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
