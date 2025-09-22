import { useState, useEffect } from 'react';
import DappPortalSDK from '@linenext/dapp-portal-sdk';

export function useDappPortal() {
  const [sdk, setSdk] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);

  useEffect(() => {
    const initDappPortal = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isLocalhost = window.location.hostname === 'localhost';
        const hasMiniDappParam = urlParams.has('minidapp') || urlParams.get('env') === 'minidapp';
        
        // Only initialize if we're in a DappPortal environment or localhost with minidapp param
        if (!hasMiniDappParam && !isLocalhost) {
          setError('Not in Mini Dapp environment');
          return;
        }
        
        let clientId = import.meta.env.VITE_DAPP_PORTAL_CLIENT_ID;
        let chainId = import.meta.env.VITE_DAPP_PORTAL_CHAIN_ID || '1001';
        
        // Allow URL parameter overrides for localhost testing
        if (isLocalhost) {
          clientId = urlParams.get('clientId') || clientId || 'localhost-test-client';
          chainId = urlParams.get('chainId') || chainId;
        }
        
        if (!clientId || clientId === 'your-client-id-here') {
          setError('DappPortal Client ID not configured. Please set VITE_DAPP_PORTAL_CLIENT_ID in your environment variables or add ?clientId=your-id to URL for localhost testing.');
          return;
        }

        console.log('Initializing DappPortal SDK with:', { clientId, chainId, isLocalhost });
        
        const dappPortalSDK = await DappPortalSDK.init({ 
          clientId, 
          chainId 
        });

        setSdk(dappPortalSDK);
        setIsSupportedBrowser(dappPortalSDK.isSupportedBrowser());
        setIsReady(true);
        
        console.log('DappPortal SDK initialized successfully');
      } catch (err) {
        console.error('DappPortal SDK initialization failed:', err);
        setError(err instanceof Error ? err.message : 'DappPortal SDK initialization failed');
      }
    };

    initDappPortal();
  }, []);

  const getWalletProvider = () => {
    if (!sdk) {
      console.warn('DappPortal SDK not initialized');
      return null;
    }
    return sdk.getWalletProvider();
  };

  const getPaymentProvider = () => {
    if (!sdk) {
      console.warn('DappPortal SDK not initialized');
      return null;
    }
    return sdk.getPaymentProvider();
  };

  return {
    sdk,
    isReady,
    error,
    isSupportedBrowser,
    getWalletProvider,
    getPaymentProvider
  };
}