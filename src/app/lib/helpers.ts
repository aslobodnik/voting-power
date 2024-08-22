import { formatUnits } from "viem";

export function formatToken(value: bigint, full: boolean = false): string {
  const numberValue = parseFloat(formatUnits(value, 18));

  if (full) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(numberValue);
  }

  if (numberValue < 1000) {
    // Below 1000: no decimals
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(numberValue);
  } else if (numberValue < 1000000) {
    // Between 1000 and 1 million: use 'k' suffix
    const thousands = numberValue / 1000;
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 1,
    }).format(thousands)}k`;
  } else {
    // 1 million and above: use 'm' suffix with 1 decimal place
    const millions = numberValue / 1000000;
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(millions)}m`;
  }
}
export function ShortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
