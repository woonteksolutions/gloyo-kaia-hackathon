/**
 * Kaia Network Configuration for LIFF and MiniDapp top-ups
 * Only available when users access via LIFF or MiniDapp SDK
 */

export const KAIA_CONFIG = {
  // Kaia network details
  NETWORK: {
    id: 'KAIA',
    name: 'Kaia',
    displayName: 'Kaia Mainnet',
    chainId: 8217,
    rpcUrl: 'https://public-en-cypress.klaytn.net',
    blockExplorer: 'https://klaytnscope.com'
  },
  
  // Only USDT available for Kaia in LIFF/MiniDapp
  SUPPORTED_TOKENS: ['USDT'] as string[],
  
  // Default token for Kaia top-ups
  DEFAULT_TOKEN: 'USDT'
} as const;

export type KaiaNetwork = typeof KAIA_CONFIG.NETWORK;
export type KaiaSupportedToken = typeof KAIA_CONFIG.SUPPORTED_TOKENS[number];

/**
 * Check if token is supported on Kaia network
 */
export const isKaiaSupportedToken = (token: string): token is KaiaSupportedToken => {
  return KAIA_CONFIG.SUPPORTED_TOKENS.includes(token as KaiaSupportedToken);
};

/**
 * Get default token for Kaia network
 */
export const getKaiaDefaultToken = (): KaiaSupportedToken => {
  return KAIA_CONFIG.DEFAULT_TOKEN;
};