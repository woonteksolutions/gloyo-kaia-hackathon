import { useLiffDappPortal } from '@/hooks/useLiffDappPortal';
import { UnifiedEmbeddedAuth } from '@/components/UnifiedEmbeddedAuth';
import { toast } from '@/hooks/use-toast';
import { useAppKit } from '@reown/appkit/react';

export function LiffCDPAuth() {
  const { 
    isLiffReady, 
    isLiffLoggedIn, 
    liffProfile: profile, 
    liffEmail,
    liffError, 
    isInClient,
    liffLogin, 
    liffLogout, 
    sendMessage, 
    shareTargetPicker,
    isDappPortalReady,
    dappPortalError,
    isFullyReady,
    combinedError,
    kaia_requestAccounts,
    getWalletProvider,
    isWalletConnected,
    walletAddress
  } = useLiffDappPortal();
  
  const { open: openExternalWallet } = useAppKit();

  // Debug logging
  console.log('🔥 LIFF-AUTH - Component render:', {
    isLiffReady,
    isLiffLoggedIn,
    isWalletConnected,
    walletAddress,
    isDappPortalReady,
    isFullyReady
  });

  const handleSendMessage = () => {
    if (sendMessage("Hello from Gloyo Dapp!")) {
      toast({
        title: "Message sent",
        description: "Message sent to LINE chat"
      });
    } else {
      toast({
        title: "Failed to send message",
        description: "Unable to send message. Make sure you're in LINE app.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    if (shareTargetPicker("Check out Gloyo Dapp!")) {
      toast({
        title: "Share opened",
        description: "Select a chat to share"
      });
    } else {
      toast({
        title: "Failed to open share",
        description: "Unable to open share picker",
        variant: "destructive"
      });
    }
  };

  const handleDappPortalWallet = async () => {
    console.log('🔥 WALLET - Starting LINE wallet connection...');
    console.log('🔥 WALLET - isDappPortalReady:', isDappPortalReady);
    console.log('🔥 WALLET - getWalletProvider():', getWalletProvider());
    console.log('🔥 WALLET - combinedError:', combinedError);
    
    try {
      if (!isDappPortalReady) {
        throw new Error('DappPortal not ready');
      }
      
      if (!getWalletProvider()) {
        throw new Error('Wallet provider not available');
      }
      
      console.log('🔥 WALLET - Calling kaia_requestAccounts...');
      const accounts = await kaia_requestAccounts();
      console.log('🔥 WALLET - Accounts received:', accounts);
      
      if (accounts && accounts.length > 0) {
        toast({
          title: "LINE Wallet Connected", 
          description: "You're now signed in with your LINE wallet"
        });
        // Persist + broadcast for app-level routing
        try {
          localStorage.setItem('liffWalletConnected', '1');
          localStorage.setItem('liffWalletAddress', accounts[0]);
          window.dispatchEvent(new CustomEvent('liffWalletConnected', { detail: { address: accounts[0] } }));
        } catch (e) {
          console.warn('Failed to persist/broadcast LIFF wallet connection', e);
        }
        // LINE wallet connection = user is signed in (like external wallets)
        // No need for additional CDP wallet setup
      } else {
        throw new Error('No accounts returned');
      }
    } catch (error) {
      console.error('🔥 WALLET - Connection failed:', error);
      toast({
        title: "Failed to connect LINE wallet",
        description: error instanceof Error ? error.message : "Connection failed",
        variant: "destructive"
      });
    }
  };

  return (
    <UnifiedEmbeddedAuth
      platform="liff"
      isPlatformLoggedIn={isLiffLoggedIn}
      platformEmail={liffEmail}
      platformProfile={profile}
      onPlatformLogin={liffLogin}
      onPlatformLogout={liffLogout}
      onExternalWallet={openExternalWallet}
      onDappPortalWallet={handleDappPortalWallet}
      isDappPortalWalletReady={isDappPortalReady && !!getWalletProvider()}
      isDappPortalWalletConnected={isWalletConnected}
      walletAddress={walletAddress}
      onSendMessage={handleSendMessage}
      onShare={handleShare}
      isInClient={isInClient}
      isPlatformReady={isFullyReady}
      platformError={combinedError}
      skipEmbeddedWalletFlow={true} // Skip CDP embedded wallet for LIFF
    />
  );
}