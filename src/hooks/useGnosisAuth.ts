import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useState } from 'react';
import { useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { setAccessToken, clearAccessToken, isTokenExpired, getTokenRemainingTime } from '@/auth/token';
import { storeAuthFromResponse } from '@/auth/normalize';
import { useWalletResponsiveness } from './useWalletResponsiveness';
import { getGnosisAuthUrl } from '@/config/api-endpoints';

interface GnosisAuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export function useGnosisAuth() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Add wallet responsiveness handling
  const {
    isResponsive,
    isWaiting,
    error: walletError,
    checkWalletResponsiveness,
    handleUnresponsiveWallet,
    signWithTimeout,
    resetWalletState
  } = useWalletResponsiveness({
    signingTimeout: 45000, // 45 seconds for signing
    connectionTimeout: 15000, // 15 seconds for connection
    maxRetries: 2
  });

  const clearAuthData = () => {
    clearAccessToken();
    console.log('🔍 Cleared authentication data');
  };

  const authenticateWithGnosis = async (): Promise<GnosisAuthResult> => {
    // Check if we have a valid token first - avoid re-auth if not needed
    if (!isTokenExpired()) {
      const remainingTime = getTokenRemainingTime();
      console.log('🔑 Valid JWT token exists, remaining time:', remainingTime, 'minutes');
      
      // If token has more than 5 minutes left, don't re-authenticate
      if (remainingTime > 5) {
        console.log('🔑 Skipping re-authentication, token still valid for', remainingTime, 'minutes');
        const currentToken = require('@/auth/token').getAccessToken();
        return { success: true, accessToken: currentToken };
      } else {
        console.log('🔑 Token expires soon, proceeding with re-authentication');
      }
    }

    if (!address || !isConnected) {
      await open();
      return { success: false, error: 'Wallet not connected' };
    }

    // Reset wallet state before starting
    resetWalletState();
    
    // Check wallet responsiveness first
    const isWalletResponsive = await checkWalletResponsiveness();
    if (!isWalletResponsive) {
      console.warn('⚠️ Wallet appears unresponsive, attempting reconnection...');
      const reconnected = await handleUnresponsiveWallet();
      if (!reconnected) {
        return { 
          success: false, 
          error: 'Wallet is not responding. Please disconnect and reconnect your wallet.' 
        };
      }
    }

    setIsAuthenticating(true);
    console.log('🔍 Starting Gnosis authentication for address:', address);

    try {
      // Clear any existing auth data first if token is expired
      if (isTokenExpired()) {
        console.log('🔑 Clearing expired token before re-authentication');
        clearAuthData();
      }

      // REAL Gnosis Pay authentication flow following their documentation
      console.log('🔍 Starting REAL Gnosis Pay authentication...');
      
      // Step 1: Get nonce from REAL Gnosis Pay API
      console.log('🔍 Step 1: Getting nonce from Gnosis Pay API...');
      const nonceResponse = await fetch(getGnosisAuthUrl('/nonce'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log('🔍 Nonce response status:', nonceResponse.status);
      
      if (!nonceResponse.ok) {
        const errorText = await nonceResponse.text();
        console.error('🔍 Nonce request failed:', errorText);
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
      
      console.log('🔍 Received nonce:', nonce);
      
      if (!nonce || typeof nonce !== 'string') {
        throw new Error('Invalid nonce received from Gnosis Pay');
      }
      
      // Step 2: Create SIWE message (following Gnosis Pay requirements)
      // Important: domain and uri should NOT be localhost/127.0.0.1 per documentation
      // Use the actual app domain
      const currentUrl = new URL(window.location.origin);
      const domain = currentUrl.hostname;
      const uri = window.location.origin;
      const chainId = 100; // Gnosis chain
      
      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in with Ethereum to access Gnosis Pay features.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      console.log('🔍 SIWE message created:', message);

      // Step 3: Sign the message with REAL wallet
      console.log('🔍 Step 3: Signing message with REAL wallet...');
      
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }

      // Use the real wallet to sign the SIWE message with timeout handling
      let signature: string;
      try {
        console.log('🔍 Requesting signature from wallet (with timeout protection)...');
        
        // Sign with timeout and retry protection
        signature = await signWithTimeout(
          walletProvider,
          'personal_sign',
          [message, address]
        );
        
        console.log('🔍 REAL signature created:', signature.substring(0, 20) + '...');
      } catch (signError) {
        console.error('🚨 Wallet signing failed:', signError);
        
        // Check if it's a timeout or responsiveness issue
        if (signError.message.includes('timeout') || signError.message.includes('not responding')) {
          return {
            success: false,
            error: 'Wallet is not responding to signing requests. Please check your wallet app and try again.'
          };
        }
        
        // Check if user rejected
        if (signError.message.includes('rejected') || signError.message.includes('denied')) {
          return {
            success: false,
            error: 'Signature was rejected. Please approve the signature request to continue.'
          };
        }
        
        throw new Error('Wallet signing failed: ' + signError.message);
      }
      
      // Step 4: Send challenge to Gnosis Pay API to get JWT with retry logic
      console.log('🔍 Step 4: Sending challenge to Gnosis Pay...');
      
      const challengeUrl = getGnosisAuthUrl('/challenge');
      console.log('🔍 Challenge URL:', challengeUrl);
      
      const challengePayload = {
        message: message,
        signature: signature
      };
      console.log('🔍 Challenge payload keys:', Object.keys(challengePayload));
      
      let challengeResponse;
      let lastError;
      
      // Retry up to 3 times for network errors
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🔍 Challenge attempt ${attempt}/3`);
          
          challengeResponse = await fetch(challengeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(challengePayload)
          });
          
          console.log('🔍 Challenge response status:', challengeResponse.status);
          break; // Success, exit retry loop
          
        } catch (error) {
          lastError = error;
          console.error(`🔍 Challenge attempt ${attempt} failed:`, error);
          
          if (attempt < 3) {
            console.log(`🔍 Retrying in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
      
      if (!challengeResponse) {
        console.error('🔍 All challenge attempts failed');
        throw new Error(`Network error: Failed to connect to authentication service after 3 attempts. ${lastError?.message || 'Connection failed'}`);
      }
      
      console.log('🔍 Challenge response status:', challengeResponse.status);
      const challengeContentType = challengeResponse.headers.get('content-type');
      console.log('🔍 Challenge response content-type:', challengeContentType);

      if (!challengeResponse.ok) {
        const errorText = await challengeResponse.text();
        console.error('🔍 Challenge request failed:', errorText);
        
        // Handle specific Gnosis Pay API errors per documentation
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
      
      // Log raw body preview before JSON parse
      const challengeRaw = await challengeResponse.clone().text();
      console.log('🔍 Challenge raw body (first 200):', challengeRaw.slice(0, 200));
      
      const challengeData = await challengeResponse.json();
      console.log('🔍 Challenge response data:', challengeData);
      console.log('🔍 Challenge response keys:', Object.keys(challengeData));
      
      // Store the accessToken using the standardized system (handles token/jwt field mapping)
      try {
        const accessToken = storeAuthFromResponse(challengeData);
        console.log('🔑 Gnosis Pay authentication successful, JWT token stored with 1-hour expiration');
        console.log('🔑 Token will be valid until:', new Date(Date.now() + 60 * 60 * 1000).toISOString());
        return { success: true, accessToken };
      } catch (error) {
        console.error('🔍 Failed to store access token:', error);
        console.error('🔍 Available fields:', Object.keys(challengeData));
        throw new Error('Failed to store access token from Gnosis Pay response');
      }

    } catch (error) {
      console.error('🔍 Authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    } finally {
      setIsAuthenticating(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      clearAuthData();
      disconnect();
      console.log('🔍 Wallet disconnected and auth data cleared');
    } catch (error) {
      console.error('🔍 Error disconnecting wallet:', error);
    }
  };

  return {
    address,
    isConnected,
    isAuthenticating,
    authenticateWithGnosis,
    disconnectWallet,
    clearAuthData,
    openWallet: open,
    
    // Token management info
    isTokenExpired: isTokenExpired(),
    tokenRemainingMinutes: getTokenRemainingTime(),
    
    // Wallet responsiveness info
    isWalletResponsive: isResponsive,
    isWalletWaiting: isWaiting,
    walletError,
    checkWalletResponsiveness,
    handleUnresponsiveWallet
  };
}