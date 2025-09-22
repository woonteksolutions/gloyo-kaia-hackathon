import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import SelectToken from './SelectToken';
import SelectNetwork from './SelectNetwork';
import SimpleAmountEntry from './SimpleAmountEntry';
import ExecuteTransactionScreen from './ExecuteTransactionScreen';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { QuoteRequest, QuoteResponse } from '@/services/rhinoService';
import { getDefaultDestinationChain, CHAIN_DEFAULTS } from '@/config/chain-defaults';
import { getTopUpTokens } from '@/config/token-defaults';
import { KAIA_CONFIG } from '@/config/kaia-config';

type TopUpStep = 'token-from' | 'network-from' | 'token-to' | 'network-to' | 'amount' | 'execute';

interface TopUpState {
  tokenFrom?: string;
  chainFrom?: string;
  tokenTo: string;
  chainTo: string;
  amount?: string;
  recipient: string;
  quote?: QuoteResponse;
}

interface TopUpAppProps {
  onClose?: () => void;
  defaultRecipient?: string;
  defaultTokenTo?: string;
  defaultChainTo?: string;
  skipDestinationSelection?: boolean;
}

const TopUpApp = forwardRef<{ handleBack: () => void }, TopUpAppProps>(({ 
  onClose, 
  defaultRecipient, 
  defaultTokenTo,
  defaultChainTo,
  skipDestinationSelection 
}, ref) => {
  const { address } = useAppKitAccount();
  const { user } = useGnosisPay();
  const { isLiff, isDappPortal } = useEnvironmentDetection();
  
  // Check if we're in LIFF or MiniDapp environment for Kaia-only mode
  const isKaiaOnlyMode = isLiff || isDappPortal;
  
  // Initialize state with explicit values - no fallbacks
  const [state, setState] = useState<TopUpState>({
    tokenFrom: isKaiaOnlyMode ? KAIA_CONFIG.DEFAULT_TOKEN : undefined,
    chainFrom: isKaiaOnlyMode ? KAIA_CONFIG.NETWORK.id : undefined,
    tokenTo: CHAIN_DEFAULTS.DESTINATION_TOKEN,
    chainTo: getDefaultDestinationChain(),
    recipient: defaultRecipient
  });

  // Update recipient when SAFE address becomes available - no fallbacks
  useEffect(() => {
    if (user?.safeAddress && !defaultRecipient) {
      setState(prev => ({ ...prev, recipient: user.safeAddress }));
    }
  }, [user?.safeAddress, defaultRecipient]);
  
  const [currentStep, setCurrentStep] = useState<TopUpStep>(
    isKaiaOnlyMode ? 'amount' : (skipDestinationSelection ? 'token-from' : 'token-from')
  );
  const [isLoading, setIsLoading] = useState(false);

  const updateState = useCallback((updates: Partial<TopUpState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleTokenFromSelect = useCallback((token: string) => {
    updateState({ tokenFrom: token });
    setCurrentStep('network-from');
  }, [updateState]);

  const handleNetworkFromSelect = useCallback((chain: string) => {
    updateState({ chainFrom: chain });
    if (skipDestinationSelection) {
      setCurrentStep('amount');
    } else {
      setCurrentStep('token-to');
    }
  }, [updateState, skipDestinationSelection]);

  const handleTokenToSelect = useCallback((token: string) => {
    updateState({ tokenTo: token });
    setCurrentStep('network-to');
  }, [updateState]);

  const handleNetworkToSelect = useCallback((chain: string) => {
    updateState({ chainTo: chain });
    setCurrentStep('amount');
  }, [updateState]);

  const handleAmountAndQuote = useCallback((amount: string, quote: QuoteResponse) => {
    updateState({ amount, quote });
    setCurrentStep('execute');
  }, [updateState]);

  const handleBack = useCallback(() => {
    switch (currentStep) {
      case 'network-from':
        setCurrentStep('token-from');
        break;
      case 'token-to':
        setCurrentStep('network-from');
        break;
      case 'network-to':
        setCurrentStep('token-to');
        break;
      case 'amount':
        if (skipDestinationSelection) {
          setCurrentStep('network-from');
        } else {
          setCurrentStep('network-to');
        }
        break;
      case 'execute':
        setCurrentStep('amount');
        break;
      default:
        onClose?.();
    }
  }, [currentStep, onClose, skipDestinationSelection]);

  // Expose handleBack function to parent component
  useImperativeHandle(ref, () => ({
    handleBack
  }), [handleBack]);

  const canProceed = () => {
    switch (currentStep) {
      case 'token-from':
        return !!state.tokenFrom;
      case 'network-from':
        return !!state.chainFrom;
      case 'token-to':
        return !!state.tokenTo;
      case 'network-to':
        return !!state.chainTo;
      case 'amount':
        return !!state.amount && !!state.quote;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    const context = isKaiaOnlyMode ? 'Kaia USDT' : (skipDestinationSelection ? 'funds' : 'bridge');
    
    switch (currentStep) {
      case 'token-from':
        return isKaiaOnlyMode ? 'Select Kaia USDT' : (skipDestinationSelection ? 'Select token to fund with' : 'Select token to bridge from');
      case 'network-from':
        return isKaiaOnlyMode ? 'Using Kaia Network' : (skipDestinationSelection ? 'Select source network' : 'Select source network');
      case 'token-to':
        return 'Select destination token';
      case 'network-to':
        return 'Select destination network';
      case 'amount':
        return 'Enter amount';
      case 'execute':
        return isKaiaOnlyMode ? 'Complete Kaia top-up' : (skipDestinationSelection ? 'Complete funding' : 'Complete bridge');
      default:
        return isKaiaOnlyMode ? 'Add Kaia funds' : (skipDestinationSelection ? 'Add funds' : 'Bridge tokens');
    }
  };

  const buildQuoteRequest = (): QuoteRequest | null => {
    if (!state.tokenFrom || !state.chainFrom || !address) {
      return null;
    }

    // Always use Safe address as recipient for Gnosis Pay users
    const recipientAddress = user?.safeAddress || state.recipient;
    
    console.log('🔍 Quote Request Address Debug:');
    console.log('  - Wallet address (depositor):', address);
    console.log('  - Safe address from user:', user?.safeAddress);
    console.log('  - State recipient:', state.recipient);
    console.log('  - Final recipient (used in quote):', recipientAddress);

    return {
      tokenIn: state.tokenFrom,
      tokenOut: state.tokenTo,
      chainIn: state.chainFrom,
      chainOut: state.chainTo,
      amount: state.amount,
      depositor: address,
      recipient: recipientAddress
    };
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
        <p className="text-muted-foreground text-center mb-6">
          Please connect your wallet to use the bridge
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentStep === 'token-from' && (
          <SelectToken
            title={isKaiaOnlyMode ? "Kaia USDT" : (skipDestinationSelection ? "Select Token" : "From Token")}
            selectedToken={state.tokenFrom}
            onSelect={handleTokenFromSelect}
            disabled={isLoading}
            filterTokens={isKaiaOnlyMode ? KAIA_CONFIG.SUPPORTED_TOKENS : (skipDestinationSelection ? getTopUpTokens() : undefined)}
          />
        )}

        {currentStep === 'network-from' && (
          <SelectNetwork
            title={isKaiaOnlyMode ? "Kaia Network" : (skipDestinationSelection ? "Select Network" : "From Network")}
            selectedChain={state.chainFrom}
            selectedToken={state.tokenFrom}
            onSelect={handleNetworkFromSelect}
            disabled={isLoading}
            autoSwitchWallet
            filterChains={isKaiaOnlyMode ? [KAIA_CONFIG.NETWORK.id] : undefined}
          />
        )}

        {!skipDestinationSelection && currentStep === 'token-to' && (
          <SelectToken
            title="To Token"
            selectedToken={state.tokenTo}
            onSelect={handleTokenToSelect}
            disabled={isLoading}
          />
        )}

        {!skipDestinationSelection && currentStep === 'network-to' && (
          <SelectNetwork
            title="To Network"
            selectedChain={state.chainTo}
            selectedToken={state.tokenTo}
            onSelect={handleNetworkToSelect}
            disabled={isLoading}
          />
        )}

        {currentStep === 'amount' && (
          <SimpleAmountEntry
            quoteRequest={buildQuoteRequest()}
            onAmountAndQuote={handleAmountAndQuote}
            disabled={isLoading}
          />
        )}

        {currentStep === 'execute' && state.quote && (
          <ExecuteTransactionScreen
            quoteRequest={buildQuoteRequest()!}
            quote={state.quote}
            onComplete={onClose}
          />
        )}
      </div>
    </div>
  );
});

TopUpApp.displayName = 'TopUpApp';

export default TopUpApp;