/**
 * ENS (Ethereum Name Service) utilities for resolving names to addresses
 */
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create a public client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

/**
 * Resolve ENS name to Ethereum address
 */
export const resolveENSName = async (ensName: string): Promise<string | null> => {
  try {
    if (!ensName.endsWith('.eth')) {
      return null;
    }

    const address = await publicClient.getEnsAddress({
      name: ensName
    });

    return address;
  } catch (error) {
    console.error('Failed to resolve ENS name:', error);
    return null;
  }
};

/**
 * Reverse resolve address to ENS name
 */
export const reverseResolveENS = async (address: string): Promise<string | null> => {
  try {
    const ensName = await publicClient.getEnsName({
      address: address as `0x${string}`
    });

    return ensName;
  } catch (error) {
    console.error('Failed to reverse resolve ENS:', error);
    return null;
  }
};

/**
 * Check if a string is a valid ENS name format
 */
export const isValidENSName = (name: string): boolean => {
  return /^[a-zA-Z0-9-]+\.eth$/.test(name);
};

/**
 * Check if a string is a valid Ethereum address format
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Resolve address or ENS name to a valid Ethereum address
 * Returns the address if valid, or resolves ENS name to address
 */
export const resolveAddressOrENS = async (input: string): Promise<string | null> => {
  // Trim whitespace
  const cleanInput = input.trim();
  
  // If it's already a valid address, return it
  if (isValidAddress(cleanInput)) {
    return cleanInput;
  }
  
  // If it looks like an ENS name, resolve it
  if (isValidENSName(cleanInput)) {
    return await resolveENSName(cleanInput);
  }
  
  return null;
};