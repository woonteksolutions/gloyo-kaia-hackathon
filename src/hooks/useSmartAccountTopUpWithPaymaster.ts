import { useCallback, useMemo } from 'react';
import { useCurrentUser, useSendUserOperation } from '@coinbase/cdp-hooks';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { KAIA_CONFIG } from '@/config/kaia-config';
import { getTopUpTokens } from '@/config/token-defaults';
import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';

// ERC-20 ABI for approve and transfer functions
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "transfer", 
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

// Network to chain ID mapping for CDP - only Base networks support paymaster
const NETWORK_MAPPING: Record<string, string> = {
  'BASE': 'base-mainnet',
  'BASE_SEPOLIA': 'base-sepolia',
  // Kaia network - smart account supported but no paymaster (user pays gas)
  'KAIA': 'kaia-mainnet'
};

// Paymaster configuration per network - only Base networks supported
const PAYMASTER_CONFIG = {
  'base-mainnet': { useCdpPaymaster: true },
  'base-sepolia': { useCdpPaymaster: true }
};

export interface SmartAccountTopUpParams {
  tokenAddress: Address;
  spenderAddress: Address;
  amount: bigint;
  network: string;
  calls?: Array<{
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
  }>;
}

/**
 * Hook to manage smart account-based top-ups with paymaster support
 * Uses CDP's paymaster for gas sponsorship on supported networks
 * Ensures all top-ups are initiated from smart accounts only
 */
export function useSmartAccountTopUpWithPaymaster() {
  const { currentUser } = useCurrentUser();
  const { sendUserOperation, status, data, error } = useSendUserOperation();
  const { isLiff, isDappPortal } = useEnvironmentDetection();
  
  // Check if we're in Kaia-only mode (LIFF or MiniDapp)
  const isKaiaOnlyMode = isLiff || isDappPortal;
  
  // Get smart account address
  const smartAccountAddress = currentUser?.evmSmartAccounts?.[0];
  const eoaAddress = currentUser?.evmAccounts?.[0];
  const hasSmartAccount = !!smartAccountAddress;
  
  /**
   * Get the primary address (smart account preferred)
   */
  const topUpAddress = useMemo((): string | null => {
    if (hasSmartAccount && smartAccountAddress) {
      return smartAccountAddress;
    }
    return null; // Only allow smart accounts for top-up
  }, [hasSmartAccount, smartAccountAddress]);
  
  /**
   * Get filtered tokens based on environment
   */
  const getAvailableTokens = useCallback((): string[] => {
    if (isKaiaOnlyMode) {
      return KAIA_CONFIG.SUPPORTED_TOKENS;
    }
    return getTopUpTokens();
  }, [isKaiaOnlyMode]);
  
  /**
   * Get filtered chains based on environment
   */
  const getAvailableChains = useCallback((): string[] | undefined => {
    if (isKaiaOnlyMode) {
      return [KAIA_CONFIG.NETWORK.id];
    }
    return undefined; // No filter for web mode
  }, [isKaiaOnlyMode]);
  
  /**
   * Check if user can perform top-up operations
   * Only allow if smart account is available
   */
  const canTopUp = useCallback((): boolean => {
    return hasSmartAccount && !!smartAccountAddress && status !== 'pending';
  }, [hasSmartAccount, smartAccountAddress, status]);
  
  /**
   * Get paymaster configuration for network
   * Returns paymaster config only for Base networks, undefined for others
   */
  const getPaymasterConfig = useCallback((network: string) => {
    const mappedNetwork = NETWORK_MAPPING[network];
    return mappedNetwork ? PAYMASTER_CONFIG[mappedNetwork] : undefined;
  }, []);
  
  /**
   * Check if paymaster is supported for the given network
   */
  const isPaymasterSupported = useCallback((network: string): boolean => {
    return !!getPaymasterConfig(network);
  }, [getPaymasterConfig]);
  
  /**
   * Execute smart account top-up with paymaster
   */
  const executeTopUp = useCallback(async (params: SmartAccountTopUpParams) => {
    if (!smartAccountAddress) {
      throw new Error('Smart account not available. Please ensure your embedded wallet is properly configured.');
    }
    
    if (!hasSmartAccount) {
      throw new Error('Smart account required for top-up operations.');
    }
    
    console.log('🔄 Executing smart account top-up:', {
      smartAccount: smartAccountAddress,
      network: params.network,
      tokenAddress: params.tokenAddress,
      amount: params.amount.toString(),
      spender: params.spenderAddress,
      paymasterSupported: isPaymasterSupported(params.network)
    });
    
    // Get network and paymaster configuration
    const paymasterConfig = getPaymasterConfig(params.network);
    const usePaymaster = !!paymasterConfig;
    const mappedNetwork = NETWORK_MAPPING[params.network];
    
    // For non-Base networks, we'll use the network as-is (no paymaster)
    const targetNetwork = mappedNetwork || params.network.toLowerCase().replace('_', '-');
    
    let calls = params.calls;
    
    // If no custom calls provided, create default approve call for Rhino.fi
    if (!calls) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [params.spenderAddress, params.amount]
      });
      
      calls = [{
        to: params.tokenAddress,
        value: 0n,
        data: approveData
      }];
    }
    
    console.log('🔄 Smart account user operation details:', {
      network: targetNetwork,
      smartAccount: smartAccountAddress,
      calls: calls.length,
      paymaster: usePaymaster ? 'CDP Paymaster (Base only)' : 'User pays gas',
      paymasterSupported: usePaymaster
    });
    
    try {
      const userOpParams: any = {
        evmSmartAccount: smartAccountAddress as Address,
        network: targetNetwork,
        calls
      };
      
      // Only add paymaster config for supported networks
      if (usePaymaster && paymasterConfig) {
        userOpParams.useCdpPaymaster = paymasterConfig.useCdpPaymaster;
      }
      
      const result = await sendUserOperation(userOpParams);
      
      console.log('✅ Smart account user operation submitted:', {
        userOperationHash: result.userOperationHash,
        network: targetNetwork,
        paymasterSponsored: usePaymaster
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ Smart account top-up failed:', error);
      throw new Error(error.message || 'Failed to execute smart account top-up');
    }
  }, [smartAccountAddress, hasSmartAccount, sendUserOperation, getPaymasterConfig]);
  
  /**
   * Get environment context information
   */
  const getEnvironmentContext = useCallback(() => {
    return {
      isKaiaOnlyMode,
      isLiff,
      isDappPortal,
      requiresSmartAccount: true,
      paymasterSupported: true,
      supportedTokens: getAvailableTokens(),
      supportedChains: getAvailableChains(),
      smartAccountAddress,
      eoaAddress
    };
  }, [isKaiaOnlyMode, isLiff, isDappPortal, getAvailableTokens, getAvailableChains, smartAccountAddress, eoaAddress]);
  
  return {
    // Smart account state
    hasSmartAccount,
    smartAccountAddress,
    eoaAddress,
    
    // Top-up configuration
    topUpAddress,
    canTopUp: canTopUp(),
    
    // Environment-based filtering
    availableTokens: getAvailableTokens(),
    availableChains: getAvailableChains(),
    isKaiaOnlyMode,
    
    // User operation state
    status,
    data,
    error,
    
    // Actions
    executeTopUp,
    getEnvironmentContext,
    getPaymasterConfig,
    isPaymasterSupported
  };
}