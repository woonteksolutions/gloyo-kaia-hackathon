import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { CHAIN_DEFAULTS, getDefaultDestinationChain } from '@/config/chain-defaults';

export interface TopUpDefaults {
  defaultRecipient?: string;
  defaultTokenTo: string;
  defaultChainTo: string;
  skipDestinationSelection: boolean;
}

/**
 * Hook to provide consistent TopUp default configuration
 * Uses centralized chain defaults for consistency
 * Safe to use even when GnosisPayProvider is not available
 */
export const useTopUpDefaults = (): TopUpDefaults => {
  try {
    const { user } = useGnosisPay();
    
    return {
      defaultRecipient: user?.safeAddress,
      defaultTokenTo: CHAIN_DEFAULTS.DESTINATION_TOKEN,
      defaultChainTo: getDefaultDestinationChain(),
      skipDestinationSelection: CHAIN_DEFAULTS.SKIP_DESTINATION_SELECTION
    };
  } catch (error) {
    // Fallback when context is not available
    console.warn('🚀 useTopUpDefaults: GnosisPayProvider not available, using fallback defaults');
    return {
      defaultRecipient: undefined,
      defaultTokenTo: CHAIN_DEFAULTS.DESTINATION_TOKEN,
      defaultChainTo: getDefaultDestinationChain(),
      skipDestinationSelection: CHAIN_DEFAULTS.SKIP_DESTINATION_SELECTION
    };
  }
};