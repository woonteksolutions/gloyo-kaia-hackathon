/**
 * Single source of truth for chain configuration and defaults
 * This ensures consistent behavior across the entire application
 */

export const CHAIN_DEFAULTS = {
  // Default destination chain for top-up operations
  DESTINATION_CHAIN: 'GNOSIS',
  
  // Default token for top-up operations  
  DESTINATION_TOKEN: 'USDC',
  
  // Whether to skip destination selection in the UI
  SKIP_DESTINATION_SELECTION: true,
} as const;

/**
 * Supported destination chains for bridging
 * Order matters for UI display priority
 */
export const SUPPORTED_DESTINATION_CHAINS = [
  'ETHEREUM',
  'ARBITRUM', 
  'BASE',
  'OPTIMISM',
  'POLYGON',
  'GNOSIS',
  'AVALANCHE'
] as const;

export type SupportedDestinationChain = typeof SUPPORTED_DESTINATION_CHAINS[number];

/**
 * Get the default destination chain for the application
 */
export const getDefaultDestinationChain = (): SupportedDestinationChain => {
  return CHAIN_DEFAULTS.DESTINATION_CHAIN;
};

/**
 * Validate if a chain is a supported destination
 */
export const isSupportedDestinationChain = (chain: string): chain is SupportedDestinationChain => {
  return SUPPORTED_DESTINATION_CHAINS.includes(chain as SupportedDestinationChain);
};