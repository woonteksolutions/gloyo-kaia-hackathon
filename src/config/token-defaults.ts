/**
 * Single source of truth for token and currency configuration
 * Centralizes all token symbols, names, and default behaviors
 */

// Core token configuration
export const TOKEN_CONFIG = {
  // Default tokens for various operations
  DEFAULTS: {
    BRIDGE_TO: 'USDC',           // Default destination token for bridging
    CURRENCY: 'USDCe',           // Default currency for Gnosis Safe
    TOP_UP_TOKENS: ['USDT', 'USDC'], // Available tokens for top-up
  },

  // Token symbol to display name mappings
  NAMES: {
    'USDT': 'Tether USD',
    'USDC': 'USD Coin', 
    'USDCe': 'USD Coin (Bridged)',
    'ETH': 'Ethereum',
    'WETH': 'Wrapped Ethereum',
    'xDAI': 'xDAI Stable Token',
    'BNB': 'BNB',
    'AVAX': 'Avalanche',
    'MATIC': 'Polygon',
  },

  // Supported tokens by operation type
  SUPPORTED: {
    BRIDGE_FROM: ['USDT', 'USDC', 'ETH', 'WETH'],
    BRIDGE_TO: ['USDC'],
    GNOSIS_SAFE: ['USDCe', 'USDC'],
  },

  // Unsupported tokens (for error handling)
  UNSUPPORTED: {
    BRIDGE: ['WBTC', 'DAI', 'MATIC', 'BNB', 'AVAX', 'TRX'],
    REASON: 'Not currently supported for bridging operations'
  }
} as const;

/**
 * Get display name for a token symbol
 */
export const getTokenName = (symbol: string): string => {
  return TOKEN_CONFIG.NAMES[symbol as keyof typeof TOKEN_CONFIG.NAMES] || symbol;
};

/**
 * Check if a token is supported for bridging from
 */
export const isSupportedBridgeFromToken = (token: string): boolean => {
  return TOKEN_CONFIG.SUPPORTED.BRIDGE_FROM.includes(token as any);
};

/**
 * Check if a token is supported for bridging to
 */
export const isSupportedBridgeToToken = (token: string): boolean => {
  return TOKEN_CONFIG.SUPPORTED.BRIDGE_TO.includes(token as any);
};

/**
 * Get default currency for Gnosis Safe operations
 */
export const getDefaultCurrency = (): string => {
  return TOKEN_CONFIG.DEFAULTS.CURRENCY;
};

/**
 * Get default tokens available for top-up operations
 */
export const getTopUpTokens = (): string[] => {
  return [...TOKEN_CONFIG.DEFAULTS.TOP_UP_TOKENS];
};