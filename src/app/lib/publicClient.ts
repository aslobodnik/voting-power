"use client";

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? "https://eth.drpc.org"
  ),
});

export default publicClient;
