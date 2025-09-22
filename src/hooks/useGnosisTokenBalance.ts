import { useState, useEffect } from 'react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';

// Gnosis Chain token address
const GNOSIS_TOKEN_ADDRESS = '0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0';
const GNOSIS_CHAIN_ID = 100;

interface TokenBalance {
  balance: number;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook to fetch Gnosis token balance from Safe address on Gnosis Chain
 * Fetches once and shares the balance across all cards
 */
export const useGnosisTokenBalance = (): TokenBalance => {
  const [balance, setBalance] = useState<TokenBalance>({
    balance: 0,
    isLoading: true
  });

  const { user } = useGnosisPay();
  const safeAddress = user?.safeAddress;

  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      if (!safeAddress) {
        setBalance({ balance: 0, isLoading: false });
        return;
      }

      try {
        setBalance(prev => ({ ...prev, isLoading: true, error: undefined }));

        // Use a public Gnosis Chain RPC endpoint
        const rpcUrl = 'https://rpc.gnosischain.com';
        
        // ERC20 balanceOf function signature
        const balanceOfSignature = '0x70a08231';
        const paddedAddress = safeAddress.slice(2).padStart(64, '0');
        const data = balanceOfSignature + paddedAddress;

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: GNOSIS_TOKEN_ADDRESS,
                data: data
              },
              'latest'
            ],
            id: 1
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || 'RPC error');
        }

        // Convert hex result to decimal and format (assuming 6 decimals for USDC)
        const hexBalance = result.result;
        const rawBalance = parseInt(hexBalance, 16);
        const formattedBalance = rawBalance / Math.pow(10, 6); // 6 decimals for USDC

        if (isMounted) {
          setBalance({
            balance: formattedBalance,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error fetching Gnosis token balance:', error);
        if (isMounted) {
          setBalance({
            balance: 0,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [safeAddress]);

  return balance;
};