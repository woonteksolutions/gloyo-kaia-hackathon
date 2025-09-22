// Token logos
import usdtLogo from '@/assets/logos/usdt-logo.png';
import usdcLogo from '@/assets/logos/usdc-logo.png';
import ethLogo from '@/assets/logos/ethereum-logo.png';

// Chain logos
import arbitrumLogo from '@/assets/logos/arbitrum-logo.png';
import avalancheLogo from '@/assets/logos/avalanche-logo.png';
import blastLogo from '@/assets/logos/blast-logo.png';
import bscLogo from '@/assets/logos/bsc-logo.png';
import baseLogo from '@/assets/logos/base-logo.png';
import ethereumLogo from '@/assets/logos/ethereum-logo.png';
import gnosisLogo from '@/assets/logos/gnosis-logo.png';
import lineaLogo from '@/assets/logos/linea-logo.jpeg';
import optimismLogo from '@/assets/logos/optimism-logo.png';
import polygonLogo from '@/assets/logos/polygon-logo.png';
import scrollLogo from '@/assets/logos/scroll-logo.png';
import tronLogo from '@/assets/logos/tron-logo.png';

/**
 * Token logo mapping
 */
const tokenLogos: Record<string, string> = {
  'USDT': usdtLogo,
  'USDC': usdcLogo,
  'ETH': ethLogo,
  'xDAI': gnosisLogo, // Use gnosis logo for xDAI
};

/**
 * Chain logo mapping
 */
const chainLogos: Record<string, string> = {
  'ETHEREUM': ethereumLogo,
  'ARBITRUM': arbitrumLogo,
  'BASE': baseLogo,
  'OPTIMISM': optimismLogo,
  'POLYGON': polygonLogo,
  'BSC': bscLogo,
  'AVALANCHE': avalancheLogo,
  'GNOSIS': gnosisLogo,
  'BLAST': blastLogo,
  'LINEA': lineaLogo,
  'SCROLL': scrollLogo,
  'TRON': tronLogo,
  'KAIA': gnosisLogo, // Fallback until we get proper Kaia logo
};

/**
 * Get token logo URL
 */
export const getTokenLogo = (symbol: string): string | undefined => {
  return tokenLogos[symbol];
};

/**
 * Get chain logo URL
 */
export const getChainLogo = (chainId: string): string | undefined => {
  return chainLogos[chainId];
};

/**
 * Check if token has a logo
 */
export const hasTokenLogo = (symbol: string): boolean => {
  return symbol in tokenLogos;
};

/**
 * Check if chain has a logo
 */
export const hasChainLogo = (chainId: string): boolean => {
  return chainId in chainLogos;
};