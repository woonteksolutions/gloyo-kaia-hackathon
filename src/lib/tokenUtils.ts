import { getTokenName } from '@/config/token-defaults';

/**
 * Token utilities for formatting and display  
 */
const tokenNames: Record<string, string> = {
  // Legacy - use getTokenName() from centralized config instead
  'USDT': 'Tether USD',
  'USDC': 'USD Coin',
  'ETH': 'Ethereum',
  'xDAI': 'xDAI',
  'BNB': 'BNB',
  'AVAX': 'Avalanche',
  'MATIC': 'Polygon'
};

/**
 * Get human-readable token name
 */
export function formatTokenName(symbol: string): string {
  // Use centralized token config
  return getTokenName(symbol);
}

/**
 * Get all available token names
 */
export function getAllTokenNames(): Record<string, string> {
  return { ...tokenNames };
}

/**
 * Check if a token is supported
 */
export function isTokenSupported(symbol: string): boolean {
  return symbol in tokenNames || getTokenName(symbol) !== symbol;
}