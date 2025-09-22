import { useState, useEffect, useRef } from 'react';
import liff from '@line/liff';
import DappPortalSDK from '@linenext/dapp-portal-sdk';

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffDecodedIDToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time: number;
  nonce: string;
  amr: string[];
  name: string;
  picture: string;
  email?: string;
}

export function useLiffDappPortal() {
  // LIFF states
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLiffLoggedIn, setIsLiffLoggedIn] = useState(false);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [liffEmail, setLiffEmail] = useState<string | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);

  // DappPortal states
  const [dappPortalSDK, setDappPortalSDK] = useState<any>(null);
  const [isDappPortalReady, setIsDappPortalReady] = useState(false);
  const [dappPortalError, setDappPortalError] = useState<string | null>(null);
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);

  // Wallet states
  const [walletAccounts, setWalletAccounts] = useState<string[]>([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Refs to ensure single initialization
  const liffInitialized = useRef(false);
  const dappPortalInitialized = useRef(false);
  const liffLogoutInProgress = useRef(false);

  // Step 1: Initialize LIFF first
  useEffect(() => {
    const initLiff = async () => {
      if (liffInitialized.current) return;
      liffInitialized.current = true;

      try {
        console.log('🔍 LIFF-DAPP - Starting LIFF initialization...');
        
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId || liffId === 'your-liff-id-here') {
          const errorMsg = 'LIFF ID not configured. Please set VITE_LIFF_ID in your environment variables.';
          setLiffError(errorMsg);
          return;
        }

        await liff.init({
          liffId,
          withLoginOnExternalBrowser: true
        });

        console.log('🔍 LIFF-DAPP - LIFF initialization successful');
        setIsLiffReady(true);
        setIsLiffLoggedIn(liff.isLoggedIn());

        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setLiffProfile(userProfile);
          
          try {
            const idToken = liff.getIDToken();
            if (idToken) {
              const decodedToken = liff.getDecodedIDToken() as LiffDecodedIDToken;
              if (decodedToken?.email) {
                setLiffEmail(decodedToken.email);
              }
            }
          } catch (emailErr) {
            console.warn('🔍 LIFF-DAPP - Could not get email from LIFF ID token:', emailErr);
          }
        }
      } catch (err) {
        console.error('🔍 LIFF-DAPP - LIFF initialization failed:', err);
        setLiffError(err instanceof Error ? err.message : 'LIFF initialization failed');
      }
    };

    initLiff();
  }, []);

// Step 2: Initialize DappPortal SDK (in LIFF or MiniDapp environments)
useEffect(() => {
  const initDappPortal = async () => {
    // Detect Mini Dapp environment via URL params or referrer
    const urlParams = new URLSearchParams(window.location.search);
    const isMiniDappParam = urlParams.has('minidapp') || urlParams.get('env') === 'minidapp';
    const isMiniDappRef = /line\.me|liff\.line|dapps\.line/i.test(document.referrer || '');
    const shouldInit = isLiffReady || isMiniDappParam || isMiniDappRef;

    if (!shouldInit || dappPortalInitialized.current) return;
    dappPortalInitialized.current = true;

    try {
      console.log('🔍 LIFF-DAPP - Starting DappPortal SDK initialization...', { isLiffReady, isMiniDappParam, isMiniDappRef });
      
      let clientId = import.meta.env.VITE_DAPP_PORTAL_CLIENT_ID;
      let chainId = import.meta.env.VITE_DAPP_PORTAL_CHAIN_ID || '1001';
      
      // Allow URL parameter overrides for localhost testing
      const isLocalhost = window.location.hostname === 'localhost';
      if (isLocalhost) {
        clientId = urlParams.get('clientId') || clientId || 'localhost-test-client';
        chainId = urlParams.get('chainId') || chainId;
      }
      
      if (!clientId || clientId === 'your-client-id-here') {
        const errorMsg = 'DappPortal Client ID not configured. Please set VITE_DAPP_PORTAL_CLIENT_ID in your environment variables.';
        setDappPortalError(errorMsg);
        return;
      }

      console.log('🔍 LIFF-DAPP - Initializing DappPortal SDK with:', { clientId, chainId });
      
      const sdk = await DappPortalSDK.init({ 
        clientId, 
        chainId 
      });

      setDappPortalSDK(sdk);
      setIsSupportedBrowser(sdk.isSupportedBrowser());
      setIsDappPortalReady(true);
      
      console.log('🔍 LIFF-DAPP - DappPortal SDK initialized successfully');
    } catch (err) {
      console.error('🔍 LIFF-DAPP - DappPortal SDK initialization failed:', err);
      setDappPortalError(err instanceof Error ? err.message : 'DappPortal SDK initialization failed');
    }
  };

  initDappPortal();
}, [isLiffReady]);

// Restore previously connected MiniDapp wallet when SDK is ready
useEffect(() => {
  const restoreWallet = async () => {
    if (!isDappPortalReady || !dappPortalSDK) return;
    try {
      const storedConnected = localStorage.getItem('liffWalletConnected') === 'true';
      const storedAddress = localStorage.getItem('liffWalletAddress');
      if (storedConnected && storedAddress) {
        setWalletAddress(storedAddress);
        setIsWalletConnected(true);
        setWalletAccounts([storedAddress]);
        return;
      }
      const walletProvider = dappPortalSDK.getWalletProvider?.();
      if (walletProvider) {
        const accounts = await walletProvider.request({ method: 'kaia_accounts' });
        if (accounts && accounts.length > 0) {
          setWalletAccounts(accounts);
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          localStorage.setItem('liffWalletConnected', 'true');
          localStorage.setItem('liffWalletAddress', accounts[0]);
        }
      }
    } catch (e) {
      console.warn('🔍 LIFF-DAPP - Wallet restore skipped:', e);
    }
  };
  restoreWallet();
}, [isDappPortalReady, dappPortalSDK]);

// LIFF methods
  const liffLogin = () => {
    if (!isLiffReady) return;
    liff.login();
  };

  const liffLogout = () => {
    if (!isLiffReady) return;
    if (liffLogoutInProgress.current) {
      console.warn('🔍 LIFF-DAPP - Logout already in progress, ignoring duplicate call');
      return;
    }
    liffLogoutInProgress.current = true;
    try {
      liff.logout(); // LIFF may trigger a reload in some hosts
    } finally {
      setIsLiffLoggedIn(false);
      setLiffProfile(null);
      setLiffEmail(null);
      try {
        localStorage.removeItem('liffWalletConnected');
        localStorage.removeItem('liffWalletAddress');
        window.dispatchEvent(new Event('liffWalletDisconnected'));
      } catch (e) {
        console.warn('Failed to clear LIFF wallet flags on logout', e);
      }
      // Reset the guard after a short delay to avoid double-trigger from UI and SDK
      setTimeout(() => { liffLogoutInProgress.current = false; }, 2000);
    }
  };

  const sendMessage = (message: string) => {
    if (!isLiffReady || !liff.isInClient()) return false;
    
    try {
      liff.sendMessages([{
        type: 'text',
        text: message
      }]);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  };

  const shareTargetPicker = (message: string) => {
    if (!isLiffReady) return false;

    try {
      liff.shareTargetPicker([{
        type: 'text',
        text: message
      }]);
      return true;
    } catch (err) {
      console.error('Failed to open share target picker:', err);
      return false;
    }
  };

  // Wallet methods using DappPortal SDK
  const kaia_requestAccounts = async () => {
    console.log('🔥 HOOK - kaia_requestAccounts called');
    console.log('🔥 HOOK - dappPortalSDK:', !!dappPortalSDK);
    console.log('🔥 HOOK - isDappPortalReady:', isDappPortalReady);
    console.log('🔥 HOOK - isSupportedBrowser:', isSupportedBrowser);
    
    if (!dappPortalSDK || !isDappPortalReady) {
      const errorMsg = `DappPortal SDK not ready - SDK: ${!!dappPortalSDK}, Ready: ${isDappPortalReady}`;
      console.warn('🔥 HOOK -', errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log('🔥 HOOK - Getting wallet provider...');
      const walletProvider = dappPortalSDK.getWalletProvider();
      console.log('🔥 HOOK - Wallet provider:', !!walletProvider);
      
      if (!walletProvider) {
        throw new Error('Wallet provider not available from DappPortal SDK');
      }

      console.log('🔥 HOOK - Requesting accounts via kaia_requestAccounts...');
      const accounts = await walletProvider.request({
        method: 'kaia_requestAccounts'
      });
      
      console.log('🔥 HOOK - Raw accounts response:', accounts);
      const addr = accounts && accounts.length > 0 ? accounts[0] : null;
      setWalletAccounts(accounts || []);
      setIsWalletConnected(!!addr);
      setWalletAddress(addr);
      try {
        if (addr) {
          localStorage.setItem('liffWalletConnected', 'true');
          localStorage.setItem('liffWalletAddress', addr);
          window.dispatchEvent(new Event('liffWalletConnected'));
        }
      } catch (e) {
        console.warn('Failed to persist LIFF wallet flags on connect', e);
      }
      
      return accounts || [];
    } catch (err) {
      console.error('🔥 HOOK - Failed to request wallet accounts:', err);
      throw err;
    }
  };

  const kaia_accounts = async () => {
    if (!dappPortalSDK || !isDappPortalReady) {
      console.warn('🔍 LIFF-DAPP - DappPortal SDK not ready');
      return [];
    }

    try {
      const walletProvider = dappPortalSDK.getWalletProvider();
      
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }

      const accounts = await walletProvider.request({
        method: 'kaia_accounts'
      });
      
      setWalletAccounts(accounts || []);
      setIsWalletConnected(accounts && accounts.length > 0);
      
      return accounts || [];
    } catch (err) {
      console.error('🔍 LIFF-DAPP - Failed to get wallet accounts:', err);
      throw err;
    }
  };

  const kaia_connectAndSign = async (message: string) => {
    if (!dappPortalSDK || !isDappPortalReady) {
      console.warn('🔍 LIFF-DAPP - DappPortal SDK not ready for signing');
      return null;
    }

    try {
      const walletProvider = dappPortalSDK.getWalletProvider();
      
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }

      const signature = await walletProvider.request({
        method: 'kaia_connectAndSign',
        params: [message]
      });
      
      return signature;
    } catch (err) {
      console.error('🔍 LIFF-DAPP - Failed to connect and sign:', err);
      throw err;
    }
  };

  const getWalletProvider = () => {
    if (!dappPortalSDK) {
      console.warn('🔍 LIFF-DAPP - DappPortal SDK not initialized');
      return null;
    }
    return dappPortalSDK.getWalletProvider();
  };

  const getPaymentProvider = () => {
    if (!dappPortalSDK) {
      console.warn('🔍 LIFF-DAPP - DappPortal SDK not initialized');
      return null;
    }
    return dappPortalSDK.getPaymentProvider();
  };

  return {
    // LIFF states and methods
    isLiffReady,
    isLiffLoggedIn,
    liffProfile,
    liffEmail,
    liffError,
    isInClient: isLiffReady ? liff.isInClient() : false,
    liffLogin,
    liffLogout,
    sendMessage,
    shareTargetPicker,
    
    // DappPortal states and methods
    dappPortalSDK,
    isDappPortalReady,
    dappPortalError,
    isSupportedBrowser,
    getWalletProvider,
    getPaymentProvider,
    
    // Wallet states and methods
    walletAccounts,
    isWalletConnected,
    walletAddress,
    kaia_requestAccounts,
    kaia_accounts,
    kaia_connectAndSign,
    
    // Combined states
    isFullyReady: isLiffReady && isDappPortalReady,
    hasError: !!(liffError || dappPortalError),
    combinedError: liffError || dappPortalError
  };
}