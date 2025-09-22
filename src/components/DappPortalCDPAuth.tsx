import { useState, useEffect } from 'react';
import { useDappPortal } from '@/hooks/useDappPortal';
import { UnifiedEmbeddedAuth } from '@/components/UnifiedEmbeddedAuth';
import { toast } from '@/hooks/use-toast';
import { useAppKit } from '@reown/appkit/react';

export function DappPortalCDPAuth() {
  const { 
    sdk,
    isReady: isDappPortalReady, 
    error: dappPortalError, 
    isSupportedBrowser,
    getWalletProvider,
    getPaymentProvider
  } = useDappPortal();

  const [isDappPortalLoggedIn, setIsDappPortalLoggedIn] = useState(false);
  const { open: openExternalWallet } = useAppKit();

  // Check DappPortal login status
  useEffect(() => {
    const checkLoginStatus = async () => {
      if (sdk && isDappPortalReady) {
        try {
          // Try to get user info to check if logged in
          const walletProvider = getWalletProvider();
          if (walletProvider) {
            // Assume logged in if wallet provider is available
            setIsDappPortalLoggedIn(true);
          }
        } catch (error) {
          console.log('User not logged in yet');
        }
      }
    };

    checkLoginStatus();
  }, [sdk, isDappPortalReady, getWalletProvider]);

  const handleDappPortalLogin = async () => {
    if (!sdk) return;

    try {
      // Trigger DappPortal login
      const walletProvider = getWalletProvider();
      if (walletProvider) {
        // If we can get wallet provider, consider as logged in
        setIsDappPortalLoggedIn(true);
        toast({
          title: "Login successful",
          description: "Choose a wallet connection method to continue"
        });
      } else {
        toast({
          title: "Login failed",
          description: "Unable to access wallet provider",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('DappPortal login error:', error);
      toast({
        title: "Login failed",
        description: "Failed to login via DappPortal",
        variant: "destructive"
      });
    }
  };

  const handleDappPortalLogout = async () => {
    setIsDappPortalLoggedIn(false);
  };

  const handleDappPortalWallet = async () => {
    try {
      const walletProvider = getWalletProvider();
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }
      
      const accounts = await walletProvider.request({
        method: 'kaia_requestAccounts'
      });
      
      if (accounts && accounts.length > 0) {
        toast({
          title: "DappPortal Wallet Connected",
          description: `Connected to ${accounts[0]}`
        });
      }
    } catch (error) {
      toast({
        title: "Failed to connect DappPortal wallet",
        description: error instanceof Error ? error.message : "Connection failed",
        variant: "destructive"
      });
    }
  };

  return (
    <UnifiedEmbeddedAuth
      platform="dappportal"
      isPlatformLoggedIn={isDappPortalLoggedIn}
      onPlatformLogin={handleDappPortalLogin}
      onPlatformLogout={handleDappPortalLogout}
      onExternalWallet={openExternalWallet}
      onDappPortalWallet={handleDappPortalWallet}
      isDappPortalWalletReady={isDappPortalReady && !!getWalletProvider()}
      isPlatformReady={isDappPortalReady}
      platformError={dappPortalError}
      isSupportedBrowser={isSupportedBrowser}
    />
  );
}