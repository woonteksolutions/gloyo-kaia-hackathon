import { useState, useEffect } from 'react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Wallet, CheckCircle, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { getDefaultCurrency } from '@/config/token-defaults';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useWalletResponsiveness } from '@/hooks/useWalletResponsiveness';
import { useIsSignedIn, useEvmAddress, useSignEvmMessage } from '@coinbase/cdp-hooks';
import { AccountIntegrityStatus } from '@gnosispay/account-kit';
import { useWalletClient } from 'wagmi';
import { signTypedData } from 'viem/accounts';
import { createWalletClient, custom } from 'viem';
import { gnosis } from 'viem/chains';
import { AppHeader } from '@/components/layout/AppHeader';


type SafeStep = 'creating' | 'currency' | 'signing' | 'deploying' | 'complete';

interface SignaturePayload {
  domain: any;
  types: any;
  message: any;
  primaryType?: string;
}

interface CreateSafeResponse {
  address?: string;
  safeAddress?: string;
  deployed?: boolean;
  transactionHash?: string;
}

interface SetCurrencyResponse {
  currency?: string;
  tokenSymbol?: string;
  fiatSymbol?: string;
}

interface DeployModulesResponse {
  transactionHash?: string;
  deployed?: boolean;
}

interface SafeConfigResponse {
  accountStatus?: number;
  tokenSymbol?: string;
  fiatSymbol?: string;
}

export default function SafeSetup() {
  const { updateUser, navigateToStep, isAuthenticated, refreshUserData } = useGnosisPay();
  const { toast } = useToast();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { withWalletTimeout, checkWalletResponsiveness, handleUnresponsiveWallet, isResponsive, error: walletError } = useWalletResponsiveness();
  const { data: walletClient } = useWalletClient();
  
  // CDP wallet hooks - using correct CDP hooks imports
  const isSignedIn = useIsSignedIn();
  const evmAddress = useEvmAddress();
  const { signEvmMessage } = useSignEvmMessage();
  
  const [step, setStep] = useState<SafeStep>('creating');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<string>('');
  const [safeAddress, setSafeAddress] = useState<string>('');
  
  // Determine which wallet is active - fix wallet detection logic
  // Extract the actual address string from CDP's object format first
  const cdpAddressString = evmAddress && typeof evmAddress === 'object' && 'evmAddress' in evmAddress 
    ? evmAddress.evmAddress 
    : evmAddress;
  
  // CDP wallet is only active if signed in AND has a valid address
  const isUsingCDPWallet = isSignedIn && !!cdpAddressString;
  
  // WalletConnect is active if connected AND has an address AND CDP is not active
  const isUsingWalletConnect = isConnected && !!address && !isUsingCDPWallet;
  
  // Use the correct address based on which wallet is active
  const activeAddress = isUsingCDPWallet ? cdpAddressString : (isUsingWalletConnect ? address : null);
  
  // Check if any wallet is connected
  const hasWalletConnection = isUsingCDPWallet || isUsingWalletConnect;
  
  // Check if user's Safe is properly configured
  const { user } = useGnosisPay();
  const isSafeProperlyConfigured = user?.safeAddress && user?.safeConfigured === true;
  
  // Debug current Safe status
  console.log('🔍 CURRENT SAFE STATUS:', {
    hasSafeAddress: !!user?.safeAddress,
    safeAddress: user?.safeAddress,
    safeConfigured: user?.safeConfigured,
    safeConfiguredType: typeof user?.safeConfigured,
    isSafeProperlyConfigured,
    userKeys: user ? Object.keys(user) : 'No user'
  });

  // Start safe creation automatically when component mounts
  useEffect(() => {
    console.log('🔍 SafeSetup component mounted, checking prerequisites...');
    
    // First, refresh user data to get latest safe config
    const initializeSafeSetup = async () => {
      if (isAuthenticated) {
        console.log('🔍 Refreshing user data for latest safe status...');
        await refreshUserData();
      }
      
      // If user's Safe is properly configured, proceed to dashboard
      if (isSafeProperlyConfigured) {
        console.log('🔍 Safe is properly configured, proceeding to dashboard');
        toast({
          title: "Safe Already Configured",
          description: "Your Gnosis Safe is already set up",
        });
        navigateToStep('dashboard');
        return;
      }

      // Debug wallet states
      console.log('🔍 Wallet Debug Info:', {
        isSignedIn,
        evmAddress,
        isConnected,
        address,
        isUsingCDPWallet,
        isUsingWalletConnect,
        hasWalletConnection,
        activeAddress: typeof activeAddress === 'string' ? activeAddress?.substring(0, 10) + '...' : activeAddress
      });

      // Check if no wallet is connected
      if (!hasWalletConnection) {
        console.log('🔍 No wallet connected - user needs to connect a wallet first');
        setError('Please connect your wallet to continue with Safe setup.');
        return;
      }
      
      if (isAuthenticated && hasWalletConnection && activeAddress) {
        console.log('🔍 Prerequisites met for Safe creation:', {
          isAuthenticated,
          walletType: isUsingCDPWallet ? 'CDP' : 'WalletConnect',
          address: typeof activeAddress === 'string' ? activeAddress?.substring(0, 10) + '...' : 'CDP Address Object',
          hasProvider: !!walletProvider,
          cdpSignedIn: isSignedIn,
          cdpAddress: evmAddress,
          wcConnected: isConnected,
          wcAddress: address
        });
        handleCreateSafe();
      } else {
        console.log('🔍 Waiting for prerequisites:', {
          isAuthenticated,
          hasWalletConnection,
          hasAddress: !!activeAddress,
          hasProvider: !!walletProvider,
          cdpSignedIn: isSignedIn,
          cdpAddress: evmAddress,
          wcConnected: isConnected,
          wcAddress: address
        });
      }
    };
    
    initializeSafeSetup();
  }, [isAuthenticated, isUsingCDPWallet, isUsingWalletConnect, activeAddress, walletProvider, isSafeProperlyConfigured, hasWalletConnection]);

  const handleCreateSafe = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 0: Check existing Safe configuration first
      console.log('🔍 Checking existing Safe configuration...');
      setStep('creating');
      
      try {
        const existingConfig = await apiFetch<any>('/safe-config');
        console.log('🔍 Existing Safe config:', existingConfig);
        console.log('🔍 Safe Status Analysis:', {
          hasAddress: !!existingConfig.address,
          isDeployed: existingConfig.isDeployed,
          accountStatus: existingConfig.accountStatus,
          statusMeaning: existingConfig.accountStatus === 0 ? 'Ok' : 
                       existingConfig.accountStatus === 7 ? 'DelayQueueNotEmpty' :
                       existingConfig.accountStatus === 1 ? 'InvalidSafeModules' :
                       existingConfig.accountStatus === 2 ? 'InvalidSpendingLimit' :
                       `Unknown status: ${existingConfig.accountStatus}`
        });
        
        // Check if safe is already fully deployed and configured
        const isFullyConfigured = 
          existingConfig.isDeployed && 
          (existingConfig.accountStatus === AccountIntegrityStatus.Ok || existingConfig.accountStatus === 7);
        
        if (isFullyConfigured) {
          const statusMessage = existingConfig.accountStatus === AccountIntegrityStatus.Ok 
            ? "Your Gnosis Safe is already deployed and ready to use"
            : "Your Gnosis Safe is deployed (pending transaction will complete shortly)";
            
          console.log('🔍 Safe already fully configured, proceeding to dashboard');
          setStep('complete');
          updateUser({ 
            safeAddress: existingConfig.address,
            safeConfigured: true 
          });
          toast({
            title: "Safe Already Configured",
            description: statusMessage,
          });
          setTimeout(() => {
            navigateToStep('dashboard');
          }, 2000);
          return;
        }
        
        // If safe exists but modules need deployment, skip creation and go to deployment
        if (existingConfig.address && !isFullyConfigured) {
          console.log('🔍 Safe exists but needs module deployment, skipping creation');
          setSafeAddress(existingConfig.address);
          setCurrency(existingConfig.tokenSymbol || getDefaultCurrency());
          // Skip to module deployment
          await deployModulesFlow(existingConfig.address);
          return;
        }
      } catch (configError: any) {
        console.log('🔍 No existing Safe found or error checking config, proceeding with creation:', configError.message);
        // Continue with safe creation if no existing config found
      }

      // Step 1: Create Safe Account
      console.log('🔍 Creating new Safe account...');
      setStep('creating');
      
      const createSafeResponse = await apiFetch<CreateSafeResponse>('/account', {
        method: 'POST',
        body: JSON.stringify({ chainId: '100' }) // Gnosis Chain only - per API docs
      });
      
      console.log('🔍 Safe created:', createSafeResponse);
      const newSafeAddress = createSafeResponse.address || createSafeResponse.safeAddress || '';
      setSafeAddress(newSafeAddress);

      // Step 2: Set Safe Currency (USDCe for all users)
      console.log(`🔍 Setting Safe currency to ${getDefaultCurrency()} for all users...`);
      setStep('currency');
      
      try {
        const setCurrencyResponse = await apiFetch<SetCurrencyResponse>('/safe/set-currency', {
          method: 'POST',
          body: JSON.stringify({ currency: getDefaultCurrency() })
        });
        
        console.log('🔍 Currency set response:', setCurrencyResponse);
        
        // Log the actual currency received vs requested
        const requestedCurrency = getDefaultCurrency();
        const receivedCurrency = setCurrencyResponse.currency || setCurrencyResponse.tokenSymbol || 'Unknown';
        
        if (receivedCurrency !== requestedCurrency && receivedCurrency !== getDefaultCurrency()) {
          console.warn(`🔍 Currency mismatch - Requested: ${requestedCurrency}, Received: ${receivedCurrency}`);
          // Show user what currency was actually set
          toast({
            title: "Currency Notice",
            description: `Safe configured with ${receivedCurrency} currency. This may affect your wallet functionality.`,
            variant: 'default',
          });
        }
        
        // Use the actual currency returned by the API
        const assignedCurrency = receivedCurrency;
        setCurrency(assignedCurrency);
        
      } catch (currencyError: any) {
        console.error('🔍 Currency setting failed:', currencyError);
        // Don't fail the entire flow for currency setting - continue with default
        const assignedCurrency = 'GBPe'; // Use default if currency setting fails
        setCurrency(assignedCurrency);
        toast({
          title: "Currency Setting Warning",
          description: "Unable to set preferred currency. Using default (GBPe).",
          variant: 'default',
        });
      }

      // Step 3: Deploy modules for the newly created Safe
      await deployModulesFlow(newSafeAddress);

    } catch (error: any) {
      console.error('🔍 Safe creation failed:', error);
      setError(error.message || 'Failed to create Safe. Please try again.');
      toast({
        title: "Safe Creation Failed",
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deployModulesFlow = async (safeAddress: string) => {
    try {
      // Comprehensive Safe module deployment status check
      console.log('🔍 Checking Safe module deployment status...');
      
      try {
        const safeConfig = await apiFetch<SafeConfigResponse>('/safe-config');
        console.log('🔍 Safe config response:', safeConfig);
        console.log('🔍 Account Status Details:', {
          accountStatus: safeConfig.accountStatus,
          isDeployed: (safeConfig as any).isDeployed,
          hasAddress: !!(safeConfig as any).address,
          statusMeaning: safeConfig.accountStatus === 0 ? 'Ok' : 
                       safeConfig.accountStatus === 7 ? 'DelayQueueNotEmpty' :
                       safeConfig.accountStatus === 1 ? 'InvalidSafeModules' :
                       safeConfig.accountStatus === 2 ? 'InvalidSpendingLimit' :
                       `Unknown status: ${safeConfig.accountStatus}`
        });
        
        // Check if modules are already deployed - multiple valid states
        const isModulesDeployed = 
          safeConfig.accountStatus === AccountIntegrityStatus.Ok || // 0 = Perfect state
          safeConfig.accountStatus === 7 || // DelayQueueNotEmpty (deployed but pending)
          (safeConfig as any).isDeployed === true; // Direct deployment flag
        
        if (isModulesDeployed) {
          const statusMessage = safeConfig.accountStatus === AccountIntegrityStatus.Ok 
            ? "Your Safe modules are already deployed and ready to use"
            : safeConfig.accountStatus === 7 
            ? "Your Safe modules are deployed (pending transaction will complete shortly)"
            : "Your Safe modules are already deployed";
            
          console.log('🔍 Safe modules already deployed, status:', safeConfig.accountStatus);
          setStep('complete');
          updateUser({ 
            safeAddress: safeAddress,
            safeConfigured: true 
          });
          toast({
            title: "Safe Already Configured",
            description: statusMessage,
          });
          setTimeout(() => {
            navigateToStep('dashboard');
          }, 2000);
          return;
        }
        
        // Log what needs to be deployed
        console.log('🔍 Safe modules need deployment:', {
          accountStatus: safeConfig.accountStatus,
          isDeployed: (safeConfig as any).isDeployed,
          reason: safeConfig.accountStatus === 0 ? 'Status is OK but not marked as deployed' :
                  safeConfig.accountStatus === 1 ? 'Invalid Safe Modules' :
                  safeConfig.accountStatus === 2 ? 'Invalid Spending Limit' :
                  `Unknown status requiring deployment: ${safeConfig.accountStatus}`
        });
        
      } catch (configError: any) {
        console.log('🔍 Safe config check failed, proceeding with deployment:', configError.message);
        // Only continue if it's a legitimate API error (not a deployment status issue)
        if (configError.status !== 404) {
          console.warn('🔍 Unexpected error checking safe config:', configError);
        }
      }

      // Step 4: Get Signature Data for Modules Setup
      console.log('🔍 Getting signature data for modules setup...');
      setStep('signing');
      
      const signaturePayload = await apiFetch<SignaturePayload>('/account/signature-payload');
      console.log('🔍 Signature payload received:', signaturePayload);
      
      // LOG THE COMPLETE STRUCTURE FROM GNOSIS PAY API
      console.log('🔍 RAW SIGNATURE PAYLOAD FROM GNOSIS PAY:');
      console.log('🔍 Domain keys:', Object.keys(signaturePayload.domain || {}));
      console.log('🔍 Domain structure:', JSON.stringify(signaturePayload.domain, null, 2));
      console.log('🔍 Types keys:', Object.keys(signaturePayload.types || {}));
      console.log('🔍 Types structure:', JSON.stringify(signaturePayload.types, null, 2));
      console.log('🔍 Message keys:', Object.keys(signaturePayload.message || {}));
      console.log('🔍 Message structure:', JSON.stringify(signaturePayload.message, null, 2));
      console.log('🔍 Primary Type:', signaturePayload.primaryType);
      console.log('🔍 FULL PAYLOAD:', JSON.stringify(signaturePayload, null, 2));

      // Step 4: Sign with the appropriate wallet
      console.log('🔍 Determining wallet signing method...', {
        isUsingCDPWallet,
        isUsingWalletConnect,
        activeAddress: typeof activeAddress === 'string' ? activeAddress?.substring(0, 10) + '...' : 'CDP Address Object'
      });
      
      if (!activeAddress) {
        throw new Error('No wallet address available. Please ensure your wallet is connected.');
      }
      
      let signature: string = '';
      
      if (isUsingCDPWallet) {
        // CDP Embedded Wallet Signing - Use viem's signTypedData
        console.log('🔍 Using CDP embedded wallet for EIP-712 signing with viem...');
        
        // Validate EIP-712 structure according to standard
        if (!signaturePayload.types || !signaturePayload.primaryType || !signaturePayload.domain || !signaturePayload.message) {
          throw new Error('Invalid EIP-712 structure: missing required fields (types, primaryType, domain, message)');
        }
        
        console.log('🔍 CDP Viem wallet client debug:', {
          hasWalletClient: !!walletClient,
          hasAccount: !!walletClient?.account,
          accountAddress: walletClient?.account?.address,
          clientChain: walletClient?.chain?.id,
          cdpAddressString
        });
        
        if (!walletClient) {
          throw new Error('Viem wallet client not available. Please ensure your wallet is properly connected.');
        }
        
        if (!walletClient.account?.address) {
          throw new Error('Wallet account not available in viem client. Please reconnect your wallet.');
        }
        
        signature = await walletClient.signTypedData({
          account: walletClient.account,
          domain: signaturePayload.domain,
          types: signaturePayload.types,
          primaryType: signaturePayload.primaryType,
          message: signaturePayload.message
        });
        
        console.log('🔍 CDP viem signTypedData successful:', signature);
        
      } else if (isUsingWalletConnect) {
        // WalletConnect Signing - Create viem client and use signTypedData
        console.log('🔍 Using WalletConnect for EIP-712 signing with viem...');
        
        if (!walletProvider) {
          throw new Error('WalletConnect provider not available. Please ensure your wallet is properly connected.');
        }
        
        if (!activeAddress) {
          throw new Error('No wallet address available. Please ensure your wallet is connected.');
        }
        
        console.log('🔍 Creating viem wallet client from WalletConnect provider...');
        
        // Create viem wallet client with account hoisted (following viem docs pattern)
        const viemClient = createWalletClient({
          account: activeAddress as `0x${string}`,
          chain: gnosis,
          transport: custom(walletProvider as any)
        });
        
        console.log('🔍 Viem client created:', {
          hasViemClient: !!viemClient,
          account: viemClient.account?.address,
          chain: viemClient.chain?.name
        });
        
        // Use viem's signTypedData (need to explicitly pass account even when hoisted)
        signature = await viemClient.signTypedData({
          account: activeAddress as `0x${string}`,
          domain: signaturePayload.domain,
          types: signaturePayload.types,
          primaryType: signaturePayload.primaryType,
          message: signaturePayload.message
        });
        
        console.log('🔍 WalletConnect viem signTypedData successful:', signature);
        
        // Validate basic signature format
        if (!signature || typeof signature !== 'string') {
          throw new Error('Invalid signature received from wallet. Please try again.');
        }
        
        // Ensure signature has 0x prefix
        if (!signature.startsWith('0x')) {
          signature = '0x' + signature;
        }
        
        // Validate signature length (should be 132 characters: 0x + 130 hex chars)
        if (signature.length !== 132) {
          console.warn('🔍 Unexpected signature length:', signature.length);
          if (signature.length < 132) {
            throw new Error(`Signature too short (${signature.length} chars). Please try signing again.`);
          }
        }
        
        console.log('🔍 WalletConnect signature validated:', signature.substring(0, 20) + '...' + signature.slice(-10));
        
      } else {
        throw new Error('No compatible wallet detected. Please connect either CDP embedded wallet or WalletConnect.');
      }

      // Step 5: Deploy Safe Modules
      console.log('🔍 Deploying Safe modules...');
      setStep('deploying');
      
      // Validate signature before using it
      if (!signature || typeof signature !== 'string') {
        throw new Error('Invalid signature received from wallet. Please try signing again.');
      }
      
      console.log('🔍 SIGNATURE GENERATED FOR SAFE MODULE DEPLOYMENT:');
      console.log('🔍 Full Signature:', signature);
      console.log('🔍 Signature Length:', signature.length);
      console.log('🔍 Signature Format:', signature.startsWith('0x') ? 'hex with 0x prefix' : 'raw hex');
      console.log('🔍 Is Valid Hex:', /^0x[a-fA-F0-9]+$/.test(signature));
      
      // Show exact format as per user's example
      console.log('🔍 API CALL FORMAT (matching your example):');
      console.log(`const url = 'https://api.gnosispay.com/api/v1/account/deploy-safe-modules';`);
      console.log(`const options = {`);
      console.log(`  method: 'PATCH',`);
      console.log(`  headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},`);
      console.log(`  body: '{"signature":"${signature}"}'`);
      console.log(`};`);
      
      // Ensure signature is properly formatted
      if (!signature.startsWith('0x')) {
        console.log('🔍 Adding 0x prefix to signature');
        signature = '0x' + signature;
      }
      
      // Try deployment with simplified retry logic
      console.log('🔍 Attempting Safe modules deployment...');
      
      let deployResponse;
      try {
        const deployPayload = { 
          signature: signature.trim() 
        };
        
        console.log('🔍 Deployment payload:', {
          signatureLength: signature.length,
          signatureFormat: signature.startsWith('0x') ? 'hex with 0x' : 'raw hex',
          isValidHex: /^0x[a-fA-F0-9]+$/.test(signature)
        });
        
        deployResponse = await apiFetch<DeployModulesResponse>('/account/deploy-safe-modules', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(deployPayload)
        });
        
        console.log('🔍 Deployment successful:', deployResponse);
        
      } catch (deployError: any) {
        console.error('🔍 Deployment failed:', deployError);
        
        // Provide specific error messages for Trust Wallet users
        if (deployError.status === 422 || deployError.message?.includes('422')) {
          throw new Error('Invalid signature format. Trust Wallet signature was rejected by Gnosis Pay. Please try disconnecting and reconnecting your wallet, then try again.');
        }
        
        if (deployError.status === 401 || deployError.message?.includes('401')) {
          throw new Error('Authentication failed. Please sign in again and retry the Safe deployment.');
        }
        
        if (deployError.status === 400 || deployError.message?.includes('400')) {
          throw new Error('Bad request. There may be an issue with your Safe configuration. Please contact support if this persists.');
        }
        
        if (deployError.message?.includes('timeout') || deployError.message?.includes('network')) {
          throw new Error('Network timeout. Please check your connection and try again.');
        }
        
        // Generic error with helpful suggestion for Trust Wallet
        throw new Error(`Deployment failed: ${deployError.message || 'Unknown error'}. If you're using Trust Wallet, try updating to the latest version or switch to MetaMask.`);
      }

      // Verify deployment was actually successful
      if (!deployResponse || (!deployResponse.deployed && !deployResponse.transactionHash)) {
        throw new Error('Safe modules deployment failed - no transaction hash or deployment confirmation received');
      }

      // Step 6: Complete
      setStep('complete');
      
      // Update user with safeConfigured: true to indicate complete setup
      updateUser({ 
        safeAddress: safeAddress,
        safeConfigured: true 
      });
      
      toast({
        title: "Safe Created Successfully",
        description: `Your Gnosis Safe has been deployed with ${currency || getDefaultCurrency()} support`,
      });
      
      // Auto-proceed to dashboard after a moment
      setTimeout(() => {
        navigateToStep('dashboard');
      }, 2000);
      
    } catch (err: any) {
      console.error('🔍 Safe creation error:', err);
      setError(err.message || 'Failed to create Safe. Please try again.');
      setStep('creating');
      toast({
        title: 'Safe Creation Failed',
        description: err.message || 'Failed to create your Safe wallet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const getStepContent = () => {
    switch (step) {
      case 'creating':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-mobile-lg">Creating Your Safe</h3>
              <p className="text-muted-foreground mt-2">Setting up your secure wallet on Gnosis Chain...</p>
            </div>
          </div>
        );
        
      case 'currency':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-mobile-lg">Setting Currency</h3>
              <p className="text-muted-foreground mt-2">Configuring {getDefaultCurrency()} for your wallet...</p>
              {currency && (
                <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm font-medium text-primary">Selected Currency: {currency}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    USD Coin (USDCe) - Universal stable currency for all users
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'signing':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-mobile-lg">Signature Required</h3>
              <p className="text-muted-foreground mt-2">Please sign the transaction in your wallet to deploy Safe modules</p>
            </div>
          </div>
        );
        
      case 'deploying':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-mobile-lg">Deploying Safe Modules</h3>
              <p className="text-muted-foreground mt-2">This may take up to 10 seconds...</p>
            </div>
          </div>
        );
        
      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 mx-auto bg-success/10 rounded-3xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-mobile-lg text-success">Safe Created Successfully!</h3>
              <p className="text-muted-foreground mt-2">
                Your Gnosis Safe is ready with {currency || getDefaultCurrency()} support
              </p>
              {safeAddress && (
                <div className="mt-4 p-3 bg-success/5 rounded-xl border border-success/20">
                  <p className="text-xs font-medium text-success">Safe Address:</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{safeAddress}</p>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Safe Setup"
        subtitle="Create your secure Gnosis Safe wallet"
        showBackButton
        onBack={() => navigateToStep('auth')}
      />
      
      <main className="mobile-container mobile-content flex items-center justify-center">
        <Card className="w-full max-w-md mobile-card shadow-mobile-elevated fade-in">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-mobile-card">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
              {!hasWalletConnection && (
                <div className="mt-4 pt-4 border-t border-destructive/20">
                  <p className="text-sm mb-3">You need to connect a wallet to continue:</p>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigateToStep('auth')}
                      className="justify-start"
                    >
                      Go back to connect wallet
                    </Button>
                  </div>
                </div>
              )}
            </Alert>
          )}

          {getStepContent()}

          </CardContent>
        </Card>
      </main>

    </div>
  );
}