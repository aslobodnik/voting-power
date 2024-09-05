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
      className={`cursor-pointer ${withLink ? "hover:underline" : ""}`}
    >
      {ensName || ShortenAddress(delegateAddress)}
    </span>
  );
  return (
    <td className="text-left w-72">
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
    </td>
  );
}

export default AddressCell;
