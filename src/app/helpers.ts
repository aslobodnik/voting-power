import { formatUnits } from "viem";

export function formatToken(value: bigint): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(parseFloat(formatUnits(value, 18)));
}
export function ShortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
