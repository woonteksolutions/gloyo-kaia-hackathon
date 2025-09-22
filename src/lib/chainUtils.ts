import { gnosis, mainnet, bsc, polygon, arbitrum, optimism, base, avalanche } from '@reown/appkit/networks';

/**
 * Network mapping for wallet switching and chain identification
 */
export const networkMap: Record<string, any> = {
  'ETHEREUM': mainnet,
  'BSC': bsc,
  'POLYGON': polygon,
  'ARBITRUM': arbitrum,
  'OPTIMISM': optimism,
  'BASE': base,
  'AVALANCHE': avalanche,
  'GNOSIS': gnosis,
  'KAIA': { 
    id: 8217, 
    name: 'Kaia',
    nativeCurrency: {
      name: 'KAIA',
      symbol: 'KAIA',
      decimals: 18,
    },
    rpcUrls: {
      default: { http: ['https://public-en.node.kaia.io'] },
      public: { http: ['https://public-en.node.kaia.io'] },
    },
    blockExplorers: {
      default: { name: 'KaiaScan', url: 'https://kaiascan.io' },
    },
  }
};

/**
 * Block explorer URLs for different chains
 */
const blockExplorers: Record<string, string> = {
  'ETHEREUM': 'https://etherscan.io/tx/',
  'ARBITRUM': 'https://arbiscan.io/tx/',
  'BASE': 'https://basescan.org/tx/',
  'OPTIMISM': 'https://optimistic.etherscan.io/tx/',
  'POLYGON': 'https://polygonscan.com/tx/',
  'BSC': 'https://bscscan.com/tx/',
  'AVALANCHE': 'https://snowtrace.io/tx/',
  'GNOSIS': 'https://gnosisscan.io/tx/',
  'KAIA': 'https://kaiascan.io/tx/'
};

/**
 * Get explorer URL for a transaction hash on a specific chain
 */
export const getExplorerUrl = (hash: string, chain: string): string => {
  return blockExplorers[chain] + hash;
};

/**
 * Chain icons/emojis for display
 */
const chainIcons: Record<string, string> = {
  'ETHEREUM': '⟠',
  'ARBITRUM': '🔵',
  'BASE': '🔷',
  'OPTIMISM': '🔴',
  'POLYGON': '🟣',
  'BSC': '🟡',
  'AVALANCHE': '🔺',
  'GNOSIS': '🟢',
  'KAIA': '🟤'
};

/**
 * Get chain icon for display
 */
export const getChainIcon = (chainId: string): string => {
  return chainIcons[chainId] || '⚡';
};

/**
 * Get network configuration for wallet switching
 */
export const getNetworkConfig = (chainId: string) => {
  return networkMap[chainId];
};