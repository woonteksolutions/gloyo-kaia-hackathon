import { useState, useCallback, useEffect } from 'react';
import { 
  useIsInitialized, 
  useIsSignedIn, 
  useEvmAddress, 
  useSignEvmMessage, 
  useSignOut,
  useSignInWithEmail,
  useVerifyEmailOTP,
  useCurrentUser
} from '@coinbase/cdp-hooks';
import { storeAuthFromResponse } from '@/auth/normalize';
import { getGnosisAuthUrl } from '@/config/api-endpoints';
import { isTokenExpired, getTokenRemainingTime } from '@/auth/token';

interface CDPAuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

interface CDPWalletState {
  isInitialized: boolean;
  isSignedIn: boolean;
  evmAddress: string | null;
  smartAccountAddress: string | null;
  hasSmartAccount: boolean;
  isCreatingSmartAccount: boolean;
  isAuthenticating: boolean;
  isSigningIn: boolean;
  flowId: string | null;
  error: string | null;
}

export function useCDPWallet() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSmartAccount, setIsCreatingSmartAccount] = useState(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // CDP hooks
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress: primaryAddress } = useEvmAddress(); // This returns smart account if exists, otherwise EOA
  const { signEvmMessage } = useSignEvmMessage();
  const { signOut } = useSignOut();
  const { currentUser } = useCurrentUser();
  
  // Sign-in hooks
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();

  // Extract addresses correctly from currentUser - these need to be after hooks but before useEffect
  const eoaAddress = currentUser?.evmAccounts?.[0]; // The actual EOA (externally owned account)
  const smartAccount = currentUser?.evmSmartAccounts?.[0]; // The smart account address
  const hasSmartAccount = !!smartAccount;

  // Clear error when wallet state changes
  useEffect(() => {
    setError(null);
  }, [isSignedIn, eoaAddress]);
  
  // Update local state when smart account is available
  useEffect(() => {
    if (smartAccount && smartAccount !== smartAccountAddress) {
      console.log('🔍 CDP - Smart account detected from currentUser:', smartAccount);
      console.log('🔍 CDP - EOA address:', eoaAddress);
      console.log('🔍 CDP - Primary address (useEvmAddress):', primaryAddress);
      setSmartAccountAddress(smartAccount);
    }
  }, [smartAccount, smartAccountAddress, eoaAddress, primaryAddress]);

  const walletState: CDPWalletState = {
    isInitialized,
    isSignedIn,
    evmAddress: eoaAddress || null, // Return the actual EOA address
    smartAccountAddress: smartAccount || null, // Return the smart account address
    hasSmartAccount,
    isCreatingSmartAccount,
    isAuthenticating,
    isSigningIn,
    flowId,
    error
  };

  const createEmbeddedWallet = useCallback(async () => {
    if (!isInitialized) {
      setError('CDP is not initialized');
      return { success: false, error: 'CDP is not initialized' };
    }

    try {
      setError(null);
      // CDP wallets are created automatically when users sign in with AuthButton
      console.log('CDP wallet will be created on sign-in');
      return { success: true };
    } catch (err) {
      console.error('Failed to create CDP wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isInitialized]);

  const disconnectWallet = useCallback(async () => {
    try {
      setError(null);
      setFlowId(null);
      await signOut();
      console.log('CDP wallet disconnected successfully');
      return { success: true };
    } catch (err) {
      console.error('Error disconnecting CDP wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [signOut]);

  const startEmailSignIn = useCallback(async (email: string) => {
    try {
      setIsSigningIn(true);
      setError(null);
      
      console.log('Starting email sign-in for:', email);
      const result = await signInWithEmail({ email });
      
      setFlowId(result.flowId);
      console.log('Email sign-in initiated, flowId:', result.flowId);
      
      return { success: true, flowId: result.flowId };
    } catch (err) {
      console.error('Failed to start email sign-in:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start sign-in';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSigningIn(false);
    }
  }, [signInWithEmail]);

  const verifyOTP = useCallback(async (otp: string) => {
    if (!flowId) {
      const errorMsg = 'No active sign-in flow. Please start sign-in first.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    try {
      setIsSigningIn(true);
      setError(null);
      
      console.log('Verifying OTP for flowId:', flowId);
      const result = await verifyEmailOTP({ flowId, otp });
      
      setFlowId(null);
      console.log('OTP verified successfully, user signed in:', result.user.userId);
      
      console.log('🔍 CDP - Sign-in successful. Checking for smart account creation...', {
        userId: result.user.userId,
        isNewUser: result.isNewUser,
        currentUserExists: !!currentUser,
        userEvmAccounts: result.user.evmAccounts?.length || 0,
        userSmartAccounts: result.user.evmSmartAccounts?.length || 0
      });

      // Smart accounts should be automatically created by CDP when createAccountOnLogin: 'evm-smart'
      // Let's check if the user has smart accounts after a short delay
      setTimeout(() => {
        console.log('🔍 CDP - Post-signin currentUser check:', {
          currentUserExists: !!currentUser,
          evmAccounts: currentUser?.evmAccounts?.length || 0,
          evmSmartAccounts: currentUser?.evmSmartAccounts?.length || 0,
          smartAccounts: currentUser?.evmSmartAccounts || []
        });
      }, 2000);
      
      return { success: true, user: result.user, isNewUser: result.isNewUser };
    } catch (err) {
      console.error('Failed to verify OTP:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSigningIn(false);
    }
  }, [flowId, verifyEmailOTP, smartAccountAddress]);

  const createSmartAccountIfNeeded = useCallback(async () => {
    // Smart accounts are automatically created by CDP when createAccountOnLogin: 'evm-smart'
    // This function now just logs the current state for debugging
    console.log('🔍 CDP - Checking smart account state:', {
      isSignedIn,
      hasSmartAccount,
      eoaAddress,
      smartAccount,
      currentUserSmartAccounts: currentUser?.evmSmartAccounts?.length || 0
    });

    if (!isSignedIn) {
      return { success: false, error: 'User not signed in' };
    }

    if (smartAccount) {
      console.log('🔍 CDP - Smart account already exists:', smartAccount);
      return { success: true, smartAccount: { address: smartAccount } };
    }

    // If no smart account exists after sign-in, there might be an issue with configuration
    if (!smartAccount && isSignedIn) {
      console.warn('🔍 CDP - No smart account found despite evm-smart config. User may have been created before smart account config was enabled.');
      const errorMsg = 'Smart account not found. Try disconnecting and reconnecting to create a new account with smart account support.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  }, [isSignedIn, hasSmartAccount, eoaAddress, smartAccount, currentUser]);

  const authenticateWithGnosis = useCallback(async (): Promise<CDPAuthResult> => {
    // Check if we have a valid token first - avoid re-auth if not needed
    if (!isTokenExpired()) {
      const remainingTime = getTokenRemainingTime();
      console.log('🔑 CDP - Valid JWT token exists, remaining time:', remainingTime, 'minutes');
      
      // If token has more than 5 minutes left, don't re-authenticate
      if (remainingTime > 5) {
        console.log('🔑 CDP - Skipping re-authentication, token still valid for', remainingTime, 'minutes');
        const currentToken = require('@/auth/token').getAccessToken();
        return { success: true, accessToken: currentToken };
      } else {
        console.log('🔑 CDP - Token expires soon, proceeding with re-authentication');
      }
    }

    console.log('🔍 CDP Wallet State (DETAILED):', { 
      isSignedIn, 
      eoaAddress, 
      smartAccount,
      isInitialized,
      currentUser: currentUser ? {
        userId: currentUser.userId,
        evmAccounts: currentUser.evmAccounts?.length || 0
      } : null
    });
    
    if (!isInitialized) {
      const errorMsg = 'CDP wallet not initialized';
      console.error('🔍 CDP Error:', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (!isSignedIn) {
      const errorMsg = 'Please sign in to your embedded wallet first';
      console.error('🔍 CDP Error:', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    console.log('🔍 CDP - Checking EVM accounts in currentUser:', {
      hasCurrentUser: !!currentUser,
      evmAccounts: currentUser?.evmAccounts || [],
      evmAccountsCount: currentUser?.evmAccounts?.length || 0,
      eoaFromAccounts: eoaAddress,
      primaryAddressFromHook: primaryAddress
    });
    
    // Add a small delay to ensure EVM account is ready after sign-in
    if (!eoaAddress) {
      console.log('🔍 CDP - No EOA address, waiting a moment for wallet setup...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // We can't call hooks conditionally, so we'll just log and continue with error
      console.warn('🔍 CDP - Still no EOA address after delay');
      
      const errorMsg = 'No EOA address found after wallet setup delay. The embedded wallet may not be fully configured. Please try disconnecting and reconnecting.';
      console.error('🔍 CDP Error:', errorMsg, { 
        currentUser: currentUser ? {
          userId: currentUser.userId,
          evmAccounts: currentUser.evmAccounts
        } : null,
        isSignedIn,
        isInitialized 
      });
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log('🔍 CDP - All checks passed, proceeding with authentication...');
    console.log('🔍 CDP - Using EOA Address for signing:', eoaAddress);
    console.log('🔍 CDP - Smart Account Address:', smartAccount);
    console.log('🔍 CDP - Current User EVM Accounts:', currentUser?.evmAccounts);

    try {
      setIsAuthenticating(true);
      setError(null);

      console.log('Starting Gnosis authentication with CDP wallet. EOA:', eoaAddress);

      // Step 1: Get nonce from Gnosis Pay API
      const nonceResponse = await fetch(getGnosisAuthUrl('/nonce'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce from Gnosis Pay');
      }
      
      // Handle both JSON and plain text nonce responses
      let nonce: string;
      const contentType = nonceResponse.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const nonceData = await nonceResponse.json();
        nonce = nonceData.nonce || nonceData;
      } else {
        // Plain text response - the edge function wraps it in JSON
        const nonceData = await nonceResponse.json();
        nonce = nonceData.nonce || nonceData;
      }
      
      if (!nonce || typeof nonce !== 'string') {
        throw new Error('Invalid nonce received from Gnosis Pay');
      }

      // Step 2: Create SIWE message - Use EOA for signing, not smart account
      const currentUrl = new URL(window.location.origin);
      const domain = currentUrl.hostname;
      const uri = window.location.origin;
      const chainId = 100; // Gnosis chain

      // CRITICAL: For SIWE authentication, always use the EOA (evmAddress), not smart account
      // Smart accounts cannot directly sign messages - only EOAs can sign
      
      // Get the actual available EVM account from CDP user data
      const availableEvmAccounts = currentUser?.evmAccounts || [];
      let signerAddress: string;
      
      // First, try to use the eoaAddress if it matches user accounts
      const hookAddressMatch = availableEvmAccounts.find(account => 
        (typeof account === 'string' ? account : (account as any).address)?.toLowerCase() === eoaAddress?.toLowerCase()
      );
      
      if (hookAddressMatch && eoaAddress) {
        signerAddress = eoaAddress;
        console.log('🔍 CDP - Using EOA address (verified in user accounts):', eoaAddress);
      } else if (availableEvmAccounts.length > 0) {
        // Use the first available EVM account if hook address doesn't match
        const firstAccount = availableEvmAccounts[0];
        signerAddress = typeof firstAccount === 'string' ? firstAccount : (firstAccount as any).address;
        console.log('🔍 CDP - Using first available EVM account from user data:', signerAddress);
        console.log('🔍 CDP - Hook EOA address did not match user accounts:', { hookAddress: eoaAddress, availableAccounts: availableEvmAccounts });
      } else {
        throw new Error('No EVM accounts available in CDP wallet. Please ensure your embedded wallet is properly configured.');
      }
      
      console.log('🔍 CDP - Gnosis Pay SIWE signing strategy:', {
        hookEoaAddress: eoaAddress,
        actualSignerAddress: signerAddress,
        smartAccount: smartAccount,
        userEvmAccountsCount: availableEvmAccounts.length,
        reason: 'Using actual available EOA for SIWE signing'
      });

      if (!signerAddress) {
        throw new Error('No valid signer address available for SIWE signing');
      }
      
      const siweMessage = `${domain} wants you to sign in with your Ethereum account:
${signerAddress}

Sign in with Ethereum to access Gnosis Pay features.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      // Additional debugging - check if we need to wait for EVM account setup
      console.log('🔍 CDP - Pre-signing wallet state check...');
      console.log('🔍 CDP - Available hooks data:', {
        eoaAddress,
        primaryAddress,
        isSignedIn,
        isInitialized,
        userExists: !!currentUser,
        signEvmMessageExists: !!signEvmMessage,
        userEvmAccounts: currentUser?.evmAccounts || []
      });

      // Check if eoaAddress exists in user's EVM accounts
      const userEvmAccounts = currentUser?.evmAccounts || [];
      const foundAccountMatch = userEvmAccounts.some(account => 
        typeof account === 'string' 
          ? account.toLowerCase() === eoaAddress?.toLowerCase()
          : (account as any).address?.toLowerCase() === eoaAddress?.toLowerCase()
      );
      
      console.log('🔍 CDP - EVM Account verification:', {
        eoaAddressFromCurrentUser: eoaAddress,
        foundInUserAccounts: foundAccountMatch,
        userEvmAccountsCount: userEvmAccounts.length,
        allUserAccounts: userEvmAccounts.map(acc => 
          typeof acc === 'string' ? acc : (acc as any).address || 'unknown'
        )
      });

      // Try to get fresh EVM address if needed
      if (!eoaAddress) {
        console.warn('🔍 CDP - No EOA address available despite being signed in');
        throw new Error('No EOA address available. Please ensure your embedded wallet is properly configured.');
      }
      
      if (!foundAccountMatch) {
        console.warn('🔍 CDP - EOA address not found in user accounts. This might cause signing issues.');
        console.warn('🔍 CDP - Available accounts vs hook address:', {
          hookAddress: eoaAddress,
          availableAccounts: userEvmAccounts.map(acc => 
            typeof acc === 'string' ? acc : (acc as any).address || 'unknown'
          )
        });
      }

      console.log('🔍 CDP - Signing SIWE message with CDP wallet...');
      console.log('🔍 CDP - Message to sign (first 100 chars):', siweMessage.substring(0, 100));
      console.log('🔍 CDP - EVM Account for signing (EOA preferred):', signerAddress);
      console.log('🔍 CDP - Calling signEvmMessage with params:', {
        evmAccount: signerAddress,
        messageLength: siweMessage.length,
        hasSignEvmMessage: !!signEvmMessage
      });
      
      console.log('🔍 CDP - COMPARISON WITH EXTERNAL WALLET:');
      console.log('🔍 CDP - External wallet would use: walletProvider.request({method: "personal_sign", params: [message, address]})');
      console.log('🔍 CDP - CDP wallet uses: signEvmMessage({evmAccount, message})');
      console.log('🔍 CDP - Key difference: External wallet connects to browser extension, CDP is embedded');

      // Step 3: Sign the message using CDP's signEvmMessage
      console.log('🔍 CDP - About to call signEvmMessage...');
      
      let signatureResponse;
      try {
        // Use EOA for signing - smart accounts cannot directly sign messages
        let accountToUse = signerAddress; // Always use the resolved EOA for message signing
        
        console.log('🔍 CDP - Final account selection for SIWE signing:', {
          eoaAddressFromCurrentUser: eoaAddress,
          resolvedSignerAddress: signerAddress,
          smartAccountAvailable: !!smartAccount,
          accountToUse,
          reasoning: 'EOA required for direct message signing in SIWE'
        });
        
        // Alternative approach: Try signing without specifying evmAccount first
        console.log('🔍 CDP - Attempting to sign SIWE message...');
        console.log('🔍 CDP - Message length:', siweMessage.length);
        console.log('🔍 CDP - Message preview:', siweMessage.substring(0, 200) + '...');
        
        signatureResponse = await signEvmMessage({
          evmAccount: accountToUse as `0x${string}`,
          message: siweMessage,
        });
        
        console.log('🔍 CDP - signEvmMessage response received:', {
          responseType: typeof signatureResponse,
          hasSignature: !!(signatureResponse as any)?.signature,
          responseKeys: signatureResponse && typeof signatureResponse === 'object' 
            ? Object.keys(signatureResponse) 
            : 'not an object',
          rawResponse: signatureResponse
        });
      } catch (signError: any) {
        console.error('🔍 CDP - signEvmMessage failed with error:', signError);
        console.error('🔍 CDP - Error details:', {
          message: signError.message,
          name: signError.name,
          code: signError.code,
          stack: signError.stack?.substring(0, 500)
        });
        
        if (signError.message?.includes('EVM account not found')) {
          console.error('🔍 CDP - EVM account not found error detected');
          console.error('🔍 CDP - Current state when error occurred:', {
            eoaAddress,
            primaryAddress,
            isSignedIn,
            isInitialized,
            currentUser: currentUser?.userId,
            evmAccountsCount: currentUser?.evmAccounts?.length || 0
          });
          
          // Try signing without specifying evmAccount (let CDP pick the default)
          console.log('🔍 CDP - Attempting alternative signing without specifying evmAccount...');
          try {
            signatureResponse = await signEvmMessage({
              message: siweMessage,
            } as any);
            
            console.log('🔍 CDP - Alternative approach succeeded:', {
              responseType: typeof signatureResponse,
              hasSignature: !!(signatureResponse as any)?.signature
            });
          } catch (altError: any) {
            console.error('🔍 CDP - Alternative approach also failed:', altError);
            throw new Error(`EVM account not found: The embedded wallet may need to be fully configured. Current address: ${eoaAddress}. Try: 1) Disconnect and reconnect 2) Clear browser data and sign in again 3) Use a different email if this persists`);
          }
        } else {
          throw signError;
        }
      }

      // Extract signature from CDP response - handle various response formats
      let signature: string;
      if (typeof signatureResponse === 'string') {
        signature = signatureResponse;
      } else if (signatureResponse && typeof signatureResponse === 'object') {
        signature = (signatureResponse as any).signature || (signatureResponse as any);
      } else {
        throw new Error('Invalid signature response from CDP wallet');
      }

      if (!signature || typeof signature !== 'string') {
        throw new Error('No valid signature returned from CDP wallet');
      }

      console.log('🔍 CDP signature obtained:', signature.substring(0, 20) + '...');

      // Step 4: Send challenge to Gnosis Pay API with retry logic
      console.log('🔍 CDP Challenging Gnosis Pay API...');
      
      const challengeUrl = getGnosisAuthUrl('/challenge');
      console.log('🔍 CDP Challenge URL:', challengeUrl);
      
      const challengePayload = {
        message: siweMessage,
        signature: signature
      };
      console.log('🔍 CDP Challenge payload keys:', Object.keys(challengePayload));
      
      let challengeResponse;
      let lastError;
      
      // Retry up to 3 times for network errors
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔍 CDP Challenge attempt ${attempt}/3`);
          
          challengeResponse = await fetch(challengeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(challengePayload)
          });
          
          console.log('🔍 CDP Challenge response status:', challengeResponse.status);
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error;
          console.error(`🔍 CDP Challenge attempt ${attempt} failed:`, error);
          
          if (attempt < 3) {
            console.log(`🔍 CDP Retrying in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
      
      if (!challengeResponse) {
        console.error('🔍 CDP All challenge attempts failed');
        throw new Error(`Network error: Failed to connect to authentication service after 3 attempts. ${lastError?.message || 'Connection failed'}`);
      }
      
      if (!challengeResponse.ok) {
        const errorText = await challengeResponse.text();
        console.error('🔍 CDP Challenge failed:', errorText);
        
        // Handle specific Gnosis Pay API errors
        if (challengeResponse.status === 401) {
          throw new Error('Authentication failed - wallet not registered with Gnosis Pay or invalid signature');
        } else if (challengeResponse.status === 422) {
          throw new Error('Invalid SIWE message format - check message structure');
        } else if (challengeResponse.status === 403) {
          throw new Error('Request blocked by firewall - domain/URI issue in SIWE message');
        } else {
          throw new Error(`Gnosis Pay API error: ${challengeResponse.status} - ${errorText}`);
        }
      }

      const cdpChallengeContentType = challengeResponse.headers.get('content-type');
      console.log('🔍 CDP Challenge content-type:', cdpChallengeContentType);
      const cdpChallengeRaw = await challengeResponse.clone().text();
      console.log('🔍 CDP Challenge raw body (first 200):', cdpChallengeRaw.slice(0, 200));
      
      const challengeData = await challengeResponse.json();
      console.log('🔍 CDP Challenge success - keys:', Object.keys(challengeData));

      // Use normalized storage to support { token | jwt | access_token }
      try {
        const accessToken = storeAuthFromResponse(challengeData);
        console.log('🔑 CDP - Gnosis Pay authentication successful, JWT token stored with 1-hour expiration');
        console.log('🔑 CDP - Token will be valid until:', new Date(Date.now() + 60 * 60 * 1000).toISOString());
        return { success: true, accessToken };
      } catch (err) {
        console.error('🔍 CDP Failed to store access token:', err);
        console.error('🔍 CDP Challenge payload:', challengeData);
        throw new Error('Failed to store access token from Gnosis Pay response');
      }

    } catch (err) {
      console.error('CDP Gnosis authentication error:', err);
      
      let errorMessage = "Failed to authenticate with Gnosis Pay";
      
      if (err instanceof Error) {
        if (err.message.includes('user rejected') || err.message.includes('User rejected')) {
          errorMessage = "Signature was rejected. Please approve the signature request to continue.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSignedIn, eoaAddress, smartAccount, signEvmMessage]);

  return {
    // Wallet state
    ...walletState,
    currentUser,
    smartAccount, // Export this for components to use
    
    // Token management info
    isTokenExpired: isTokenExpired(),
    tokenRemainingMinutes: getTokenRemainingTime(),
    
    // Actions
    createEmbeddedWallet,
    disconnectWallet,
    startEmailSignIn,
    verifyOTP,
    authenticateWithGnosis,
    createSmartAccountIfNeeded,
    
    // Utils
    clearError: () => {
      setError(null);
      setFlowId(null);
    }
  };
}