import { useState, useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { KAIA_CONFIG } from '@/config/kaia-config';
import { formatUnits } from 'viem';
import { useReadContract, useChainId } from 'wagmi';
import { erc20Abi } from 'viem';

interface TokenBalance {
  symbol: string;
  balance: string;
  formatted: string;
  usdValue?: string;
}

interface WalletBalance {
  total: string;
  tokens: TokenBalance[];
  isLoading: boolean;
  error?: string;
}

// ERC20 token contract addresses
const TOKEN_CONTRACTS = {
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',     // Ethereum
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',   // Polygon  
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',  // Base
    8217: '0xcee8faf64bb97a73bb51e115aa89c17ffa8dd167',  // Kaia (oUSDT)
  },
  USDC: {
    1: '0xA0b86a33E6441b4f73a7c22E45fcCF8e1A459Ff0',     // Ethereum
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',   // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum  
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
  }
};

const SUPPORTED_CHAINS = [1, 137, 42161, 8453, 8217]; // Ethereum, Polygon, Arbitrum, Base, Kaia

export function useWalletBalance(): WalletBalance {
  const [balance, setBalance] = useState<WalletBalance>({
    total: '0.00',
    tokens: [],
    isLoading: true,
  });

  const { address: externalAddress, isConnected } = useAppKitAccount();
  const { evmAddress: cdpAddress, smartAccountAddress, isSignedIn } = useCDPWallet();
  const { isLiff, isDappPortal } = useEnvironmentDetection();

  // Determine which address to use based on wallet type and environment
  let targetAddress: string | undefined;
  if (isLiff || isDappPortal) {
    // LIFF/MiniDapp: use smart account address if available
    targetAddress = smartAccountAddress || cdpAddress;
  } else if (isSignedIn) {
    // Embedded wallet: use smart account address if available, fallback to CDP address
    targetAddress = smartAccountAddress || cdpAddress;
  } else {
    // External wallet: use connected address
    targetAddress = externalAddress;
  }

  const hasWallet = isSignedIn || isConnected;

  useEffect(() => {
    if (!hasWallet || !targetAddress) {
      setBalance({ total: '0.00', tokens: [], isLoading: false });
      return;
    }

    const fetchBalances = async () => {
      setBalance(prev => ({ ...prev, isLoading: true, error: undefined }));

      try {
        let tokens: TokenBalance[] = [];

        if (isLiff || isDappPortal) {
          // LIFF/MiniDapp: Only fetch Kaia USDT balance on smart account
          const kaiaBalance = await fetchKaiaUSDTBalance(targetAddress);
          if (kaiaBalance) {
            tokens.push(kaiaBalance);
          }
        } else if (isSignedIn) {
          // Embedded wallet: Fetch smart account USDC and USDT balance
          const smartAccountBalances = await fetchSmartAccountBalances(targetAddress);
          tokens = smartAccountBalances;
        } else {
          // External wallet: Fetch connected wallet USDC and USDT balance (combined)
          const externalBalances = await fetchExternalWalletBalances(targetAddress);
          tokens = externalBalances;
        }

        const total = tokens.reduce((sum, token) => {
          const value = parseFloat(token.usdValue || '0');
          return sum + value;
        }, 0);

        setBalance({
          total: total.toFixed(2),
          tokens,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setBalance({
          total: '0.00',
          tokens: [],
          isLoading: false,
          error: 'Failed to fetch balance',
        });
      }
    };

    fetchBalances();
  }, [targetAddress, hasWallet, isLiff, isDappPortal, isSignedIn]);

  return balance;
}

async function fetchKaiaUSDTBalance(address: string): Promise<TokenBalance | null> {
  try {
    // Placeholder implementation - need actual Kaia RPC call
    // This would normally use ethers or viem with Kaia RPC
    console.log('Fetching Kaia USDT balance for:', address);
    
    // Mock response for now
    return {
      symbol: 'USDT',
      balance: '0',
      formatted: '0.00',
      usdValue: '0.00',
    };
  } catch (error) {
    console.error('Error fetching Kaia USDT balance:', error);
    return null;
  }
}

async function fetchSmartAccountBalances(address: string): Promise<TokenBalance[]> {
  try {
    // Placeholder implementation - need actual smart account balance calls
    console.log('Fetching smart account balances for:', address);
    
    // Mock combined USDT + USDC balance for smart account
    return [
      {
        symbol: 'USDT',
        balance: '0',
        formatted: '0.00',
        usdValue: '0.00',
      },
      {
        symbol: 'USDC',
        balance: '0',
        formatted: '0.00',
        usdValue: '0.00',
      }
    ];
  } catch (error) {
    console.error('Error fetching smart account balances:', error);
    return [];
  }
}

async function fetchExternalWalletBalances(address: string): Promise<TokenBalance[]> {
  try {
    console.log('Fetching external wallet balances for:', address);
    
    const tokens: TokenBalance[] = [];
    
    // Fetch balances across all supported chains
    for (const chainId of SUPPORTED_CHAINS) {
      // Fetch USDT balance if contract exists for this chain
      if (TOKEN_CONTRACTS.USDT[chainId as keyof typeof TOKEN_CONTRACTS.USDT]) {
        try {
          const balance = await fetchTokenBalance(
            address, 
            TOKEN_CONTRACTS.USDT[chainId as keyof typeof TOKEN_CONTRACTS.USDT] as string,
            chainId
          );
          if (balance && parseFloat(balance.formatted) > 0) {
            tokens.push({
              ...balance,
              symbol: `USDT`,
            });
          }
        } catch (error) {
          console.error(`Error fetching USDT balance on chain ${chainId}:`, error);
        }
      }

      // Fetch USDC balance if contract exists for this chain  
      if (TOKEN_CONTRACTS.USDC[chainId as keyof typeof TOKEN_CONTRACTS.USDC]) {
        try {
          const balance = await fetchTokenBalance(
            address,
            TOKEN_CONTRACTS.USDC[chainId as keyof typeof TOKEN_CONTRACTS.USDC] as string, 
            chainId
          );
          if (balance && parseFloat(balance.formatted) > 0) {
            tokens.push({
              ...balance,
              symbol: `USDC`,
            });
          }
        } catch (error) {
          console.error(`Error fetching USDC balance on chain ${chainId}:`, error);
        }
      }
    }

    // If no balances found, return empty array (will show 0.00)
    return tokens;
    
  } catch (error) {
    console.error('Error fetching external wallet balances:', error);
    return [];
  }
}

async function fetchTokenBalance(address: string, tokenContract: string, chainId: number): Promise<TokenBalance | null> {
  try {
    // This is a placeholder - in production you would use wagmi's readContract
    // or viem's readContract with the appropriate RPC providers
    console.log(`Fetching token balance for ${address} on chain ${chainId} for contract ${tokenContract}`);
    
    // For now, return null to indicate no balance (will be filtered out)
    // In production, this would be:
    // const balance = await readContract({
    //   address: tokenContract as `0x${string}`,
    //   abi: erc20Abi,
    //   functionName: 'balanceOf',
    //   args: [address as `0x${string}`],
    //   chainId,
    // });
    // const decimals = await readContract({
    //   address: tokenContract as `0x${string}`,
    //   abi: erc20Abi, 
    //   functionName: 'decimals',
    //   chainId,
    // });
    // const formatted = formatUnits(balance, decimals);
    // return {
    //   balance: balance.toString(),
    //   formatted: parseFloat(formatted).toFixed(2),
    //   usdValue: parseFloat(formatted).toFixed(2), // Assuming 1:1 USD peg
    // };
    
    return null;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return null;
  }
}