"use client";

import { Address } from "viem";

import publicClient from "./publicClient";

// Module-level cache keyed on lowercased address. Stores the in-flight or
// settled promise so concurrent callers and later lookups share a single
// network request for the life of the session. Rejected promises are kept
// intentionally — failures stay silent for the session, matching the prior
// per-component effect behavior.
const ensNameCache = new Map<string, Promise<string | null>>();

export function getEnsNameCached(address: string): Promise<string | null> {
  const key = address.toLowerCase();

  const cached = ensNameCache.get(key);
  if (cached) {
    return cached;
  }

  const pending = publicClient.getEnsName({
    address: address as Address,
  });

  ensNameCache.set(key, pending);
  return pending;
}

export default getEnsNameCached;
