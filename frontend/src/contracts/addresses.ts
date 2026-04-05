/**
 * Contract addresses per chain ID.
 * Update these after running the Hardhat deploy script.
 *
 * Local Hardhat:  npx hardhat node  →  npx hardhat run scripts/deploy.ts --network localhost
 * Sepolia:        npx hardhat run scripts/deploy.ts --network sepolia
 */
export const CONTRACT_ADDRESSES: Record<number, string> = {
  // Hardhat local node (default first deploy address when no other contracts deployed)
  31337: import.meta.env.VITE_CONTRACT_ADDRESS_31337 ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  // Sepolia testnet — fill in after deployment
  11155111: import.meta.env.VITE_CONTRACT_ADDRESS_11155111 ?? '',
}

export function getContractAddress(chainId: number): string | null {
  return CONTRACT_ADDRESSES[chainId] ?? null
}
