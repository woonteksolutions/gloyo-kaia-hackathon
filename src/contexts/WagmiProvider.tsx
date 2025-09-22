import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { gnosis, gnosisChiado, mainnet, bsc, polygon, arbitrum, optimism, base, avalanche } from '@reown/appkit/networks';

// Define KAIA network
const kaia = {
  id: 8217,
  name: 'Kaia',
  nativeCurrency: {
    decimals: 18,
    name: 'KAIA',
    symbol: 'KAIA',
  },
  rpcUrls: {
    default: {
      http: ['https://public-en.node.kaia.io'],
    },
  },
  blockExplorers: {
    default: { name: 'KaiaScan', url: 'https://kaiascan.io' },
  },
} as const;

const queryClient = new QueryClient();

// 1. Get projectId from environment
const projectId = 'ee44cd2ca05bd1af98fc7dadfe156cd6';

// 2. Set up Wagmi adapter (only for AppKit internal use)
const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  networks: [mainnet, bsc, polygon, arbitrum, optimism, base, avalanche, gnosis, gnosisChiado, kaia],
  projectId
});

// 2b. Use the wagmi adapter config directly (it already includes coinbase support via AppKit)
export const config = wagmiAdapter.wagmiConfig;

// 3. Create AppKit immediately at module level (only in browser)
let appKit: any = null;
if (typeof window !== 'undefined') {
  try {
    console.log('Initializing AppKit at module level...');
    appKit = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks: [mainnet, bsc, polygon, arbitrum, optimism, base, avalanche, gnosis, gnosisChiado, kaia],
      defaultNetwork: gnosis,
      allowUnsupportedChain: true,
      metadata: {
        name: 'Gloyo Dapp',
        description: 'Your gateway to decentralized finance with secure wallet integration, payments, and DeFi services',
        url: window.location.origin,
        icons: [`${window.location.origin}/gloyo-uploads/gloyo-logo.png`]
      },
      features: {
        analytics: false,
        onramp: false,
        swaps: false,
        email: false,
        socials: false,
        send: false,
        receive: false
      },
      enableWalletConnect: true,
      enableInjected: true,
      enableEIP6963: true,
      enableCoinbase: true
    });
    console.log('AppKit initialized successfully at module level');
  } catch (error) {
    console.error('Failed to initialize AppKit:', error);
  }
}

interface WagmiWrapperProps {
  children: ReactNode;
}

export function WagmiWrapper({ children }: WagmiWrapperProps) {

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}