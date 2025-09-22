/**
 * Shared chain mappings for Supabase Edge Functions
 * Single source of truth for chain name mappings across all edge functions
 */

// Chain mapping from frontend display names to Rhino.fi SDK chain names
export const CHAIN_MAPPINGS = {
  // Primary chains
  'ETHEREUM': 'ETHEREUM',
  'ARBITRUM': 'ARBITRUM_ONE', 
  'BASE': 'BASE',
  'OPTIMISM': 'OPTIMISM',
  'POLYGON': 'POLYGON',
  'GNOSIS': 'GNOSIS',
  'AVALANCHE': 'AVALANCHE',
  
  // Alternative names / aliases
  'BSC': 'BINANCE',
  'BNB': 'BINANCE', 
  'BINANCE': 'BINANCE',
  'BNB_SMART_CHAIN': 'BINANCE',
  'BINANCE_SMART_CHAIN': 'BINANCE',
  'SMART': 'BINANCE',
  
  // Polygon aliases
  'MATIC': 'POLYGON',
  'MATIC_POS': 'POLYGON',
  'POLYGON_POS': 'POLYGON',
  
  // Other supported chains
  'LINEA': 'LINEA',
  'SCROLL': 'SCROLL', 
  'BLAST': 'BLAST',
  'MANTLE': 'MANTLE',
  'TRON': 'TRON',
  'KAIA': 'KAIA',
} as const;

// Token mapping from display names to Rhino.fi SDK token names
export const TOKEN_MAPPINGS = {
  'USDC': 'USDC',
  'USDT': 'USDT', 
  'ETH': 'ETH',
  'WETH': 'ETH',
  'WBTC': 'ETH',  // Mapped to ETH for compatibility
  'DAI': 'USDC',  // Mapped to USDC for compatibility
} as const;

/**
 * Map frontend chain name to Rhino SDK chain name
 */
export const mapChainForRhino = (chainName: string): string => {
  const upperChainName = chainName?.toUpperCase() || '';
  const mappedChain = CHAIN_MAPPINGS[upperChainName as keyof typeof CHAIN_MAPPINGS];
  
  if (!mappedChain) {
    throw new Error(`Chain \"${chainName}\" is not supported. Available chains: ${Object.keys(CHAIN_MAPPINGS).join(', ')}`);
  }
  
  return mappedChain;
};

/**
 * Map frontend token name to Rhino SDK token name  
 */
export const mapTokenForRhino = (tokenSymbol: string): string => {
  const upperTokenSymbol = tokenSymbol?.toUpperCase() || '';
  return TOKEN_MAPPINGS[upperTokenSymbol as keyof typeof TOKEN_MAPPINGS] || tokenSymbol;
};

/**
 * Get list of supported chain names
 */
export const getSupportedChains = (): string[] => {
  return Object.keys(CHAIN_MAPPINGS);
};

/**
 * Get list of supported token names
 */
export const getSupportedTokens = (): string[] => {
  return Object.keys(TOKEN_MAPPINGS);
};

/**
 * Validate if a chain is supported
 */
export const isChainSupported = (chainName: string): boolean => {
  const upperChainName = chainName?.toUpperCase() || '';
  return upperChainName in CHAIN_MAPPINGS;
};

/**
 * Validate if a token is supported
 */
export const isTokenSupported = (tokenSymbol: string): boolean => {
  const upperTokenSymbol = tokenSymbol?.toUpperCase() || '';
  return upperTokenSymbol in TOKEN_MAPPINGS;
};
