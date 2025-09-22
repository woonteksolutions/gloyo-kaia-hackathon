import { useCallback } from 'react';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { KAIA_CONFIG } from '@/config/kaia-config';
import { getTopUpTokens } from '@/config/token-defaults';

/**
 * Hook to manage smart account-based top-ups with environment-specific filtering
 * Ensures all top-ups are initiated from smart accounts only
 * Filters tokens/chains based on LIFF/MiniDapp context
 */
export function useSmartAccountTopUp() {
  const { 
    smartAccountAddress, 
    hasSmartAccount, 
    isCreatingSmartAccount,
    createSmartAccountIfNeeded,
    evmAddress 
  } = useCDPWallet();
  
  const { isLiff, isDappPortal } = useEnvironmentDetection();
  
  // Check if we're in Kaia-only mode (LIFF or MiniDapp)
  const isKaiaOnlyMode = isLiff || isDappPortal;
  
  /**
   * Get the address to use for top-up operations
   * Always prioritizes smart account address over EOA
   */
  const getTopUpAddress = useCallback((): string | null => {
    if (hasSmartAccount && smartAccountAddress) {
      return smartAccountAddress;
    }
    
    // Fallback to EOA if smart account not available yet
    if (evmAddress) {
      console.warn('⚠️ Using EOA for top-up - Smart account not available');
      return evmAddress;
    }
    
    return null;
  }, [hasSmartAccount, smartAccountAddress, evmAddress]);
  
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
   */
  const canTopUp = useCallback((): boolean => {
    const address = getTopUpAddress();
    return !!address && !isCreatingSmartAccount;
  }, [getTopUpAddress, isCreatingSmartAccount]);
  
  /**
   * Get environment context information
   */
  const getEnvironmentContext = useCallback(() => {
    return {
      isKaiaOnlyMode,
      isLiff,
      isDappPortal,
      requiresSmartAccount: true, // All top-ups require smart account
      supportedTokens: getAvailableTokens(),
      supportedChains: getAvailableChains()
    };
  }, [isKaiaOnlyMode, isLiff, isDappPortal, getAvailableTokens, getAvailableChains]);
  
  return {
    // Smart account state
    hasSmartAccount,
    smartAccountAddress,
    isCreatingSmartAccount,
    
    // Top-up configuration
    topUpAddress: getTopUpAddress(),
    canTopUp: canTopUp(),
    
    // Environment-based filtering
    availableTokens: getAvailableTokens(),
    availableChains: getAvailableChains(),
    isKaiaOnlyMode,
    
    // Actions
    createSmartAccountIfNeeded,
    getEnvironmentContext
  };
}