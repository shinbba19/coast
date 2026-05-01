import deployedAddresses from "./deployedAddresses.json";

export const CONTRACT_ADDRESSES = {
  musdt:         deployedAddresses.musdt         as `0x${string}`,
  propertyToken: deployedAddresses.propertyToken as `0x${string}`,
  marketplace:   deployedAddresses.marketplace   as `0x${string}`,
  dividendVault: deployedAddresses.dividendVault as `0x${string}`,
  deployer:      deployedAddresses.deployer      as `0x${string}`,
} as const;

// Maps property string IDs (from mockData.ts) to on-chain ERC1155 tokenIds
export const PROPERTY_TOKEN_IDS: Record<string, bigint> = {
  "prop-001": 1n,
  "prop-002": 2n,
  "prop-003": 3n,
  "prop-004": 4n,
  "prop-005": 5n,
};

export const ALL_TOKEN_IDS = [1n, 2n, 3n, 4n, 5n] as const;

export const SUPPORTED_CHAIN_IDS = [31337, 84532, 11155111] as const;

export const CHAIN_NAMES: Record<number, string> = {
  31337: "Hardhat Local",
  84532: "Base Sepolia",
  11155111: "Sepolia",
};

export const BLOCK_EXPLORER: Record<number, string> = {
  31337: "",
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
};

export function isDeployed(): boolean {
  return deployedAddresses.deployer !== "0x0000000000000000000000000000000000000000";
}

export function isLocalNetwork(chainId: number): boolean {
  return chainId === 31337;
}

export function txExplorerUrl(chainId: number, txHash: string): string | null {
  const base = BLOCK_EXPLORER[chainId];
  if (!base) return null;
  return `${base}/tx/${txHash}`;
}

/** Format mUSDT atoms (6 decimals) to display string */
export function formatMusdt(atoms: bigint, decimals = 2): string {
  const num = Number(atoms) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Parse a float string to mUSDT atoms */
export function parseMusdt(amount: string | number): bigint {
  const float = typeof amount === "string" ? parseFloat(amount) : amount;
  return BigInt(Math.round(float * 1e6));
}
