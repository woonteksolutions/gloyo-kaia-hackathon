import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useAppKitAccount } from '@reown/appkit/react';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { useGnosisAuth } from '@/hooks/useGnosisAuth';
import { useToast } from '@/hooks/use-toast';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { useLiffDappPortal } from '@/hooks/useLiffDappPortal';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { TrendingUp } from 'lucide-react';
import cardIllustration from '@/assets/card-illustration.png';
import { storeAuthFromResponse } from '@/auth/normalize';
import { getGnosisAuthUrl } from '@/config/api-endpoints';

export function PreAuthDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'card' | 'earn'>('card');
  const { setAccessToken, navigateToStep, refreshUserData, isAuthenticated, accessToken } = useGnosisPay();
  const { isConnected } = useAppKitAccount();
  const { isSignedIn, authenticateWithGnosis: authenticateWithGnosisCDP } = useCDPWallet();
  const { authenticateWithGnosis: authenticateWithGnosisExternal } = useGnosisAuth();
  const { isLiff, isDappPortal } = useEnvironmentDetection();
  const { toast } = useToast();
  
  // Get LIFF DappPortal hook for LINE wallet integration
  const { 
    isWalletConnected: isLineWalletConnected,
    walletAddress: lineWalletAddress,
    getWalletProvider,
    kaia_requestAccounts 
  } = useLiffDappPortal();
  
  // LINE wallet Gnosis Pay authentication
  const authenticateLineWalletWithGnosis = async () => {
    console.log('🔍 Starting LINE wallet Gnosis Pay authentication...');
    
    if (!isLineWalletConnected || !lineWalletAddress) {
      throw new Error('LINE wallet not connected');
    }
    
    const walletProvider = getWalletProvider();
    if (!walletProvider) {
      throw new Error('LINE wallet provider not available');
    }

    try {
      // Step 1: Get nonce from Gnosis Pay API
      console.log('🔍 Getting nonce from Gnosis Pay...');
      const nonceResponse = await fetch(getGnosisAuthUrl('/nonce'), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce from Gnosis Pay');
      }
      
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.nonce || nonceData;
      console.log('🔍 Received nonce:', nonce);

      // Step 2: Build SIWE message with Gnosis chainId (100)
      const currentUrl = new URL(window.location.origin);
      const domain = currentUrl.hostname;
      const uri = window.location.origin;
      const chainId = 100; // Gnosis chain - key insight: we specify Gnosis chain even though wallet is on Kaia

      const message = `${domain} wants you to sign in with your Ethereum account:
${lineWalletAddress}

Sign in with Ethereum to access Gnosis Pay features.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      console.log('🔍 SIWE message for Gnosis chain:', message);

      // Step 3: Sign with LINE wallet provider (off-chain signing works across chains)
      console.log('🔍 Signing SIWE message with LINE wallet...');
      
      let signature: string;
      try {
        // Try personal_sign first (preferred method)
        signature = await walletProvider.request({
          method: 'personal_sign',
          params: [message, lineWalletAddress]
        });
      } catch (personalSignError) {
        console.log('🔍 personal_sign failed, trying eth_sign fallback...');
        try {
          // Fallback to eth_sign (Kaia ≥ v1.0.1 produces EIP-191 prefix compatible with SIWE)
          signature = await walletProvider.request({
            method: 'eth_sign',
            params: [lineWalletAddress, message]
          });
        } catch (ethSignError) {
          throw new Error('Both personal_sign and eth_sign failed');
        }
      }
      
      console.log('🔍 LINE wallet signature:', signature.substring(0, 20) + '...');

      // Step 4: Send challenge to Gnosis Pay
      console.log('🔍 Sending challenge to Gnosis Pay...');
      const challengeResponse = await fetch(getGnosisAuthUrl('/challenge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          signature: signature
        })
      });
      
      if (!challengeResponse.ok) {
        const errorText = await challengeResponse.text();
        console.error('🔍 Challenge failed:', errorText);
        throw new Error(`Gnosis Pay authentication failed: ${challengeResponse.status}`);
      }
      
      const challengeData = await challengeResponse.json();
      console.log('🔍 Gnosis Pay challenge successful');
      
      // Store the access token
      const accessToken = storeAuthFromResponse(challengeData);
      return { success: true, accessToken };
      
    } catch (error) {
      console.error('🔍 LINE wallet Gnosis auth error:', error);
      throw error;
    }
  };

  const handleAccessClick = async () => {
    // Prevent multiple clicks if already authenticated or loading
    if (isAuthenticated || isLoading) {
      console.log('🔍 Ignoring access click - already authenticated or loading');
      return;
    }

    try {
      setIsLoading(true);
      let result;

      // Priority: LINE Mini App or LIFF with LINE wallet
      if ((isLiff || isDappPortal)) {
        // Ensure MiniDapp wallet is connected
        if (!isLineWalletConnected || !lineWalletAddress) {
          console.log('🔍 MiniDapp/LIFF detected, requesting LINE wallet connection...');
          try {
            await kaia_requestAccounts();
          } catch (e) {
            throw new Error('LINE wallet connection failed');
          }
        }
        console.log('🔍 Using cross-chain SIWE for Gnosis Pay via LINE wallet...');
        result = await authenticateLineWalletWithGnosis();
      }
      // Trigger Gnosis Pay authentication for other wallet types
      else if (isSignedIn) {
        console.log('🔍 Starting embedded wallet Gnosis authentication...');
        result = await authenticateWithGnosisCDP();
      } else if (isConnected) {
        console.log('🔍 Starting external wallet Gnosis authentication...');
        result = await authenticateWithGnosisExternal();
      } else {
        // No wallet connected: route to auth to prompt connection
        console.log('🔍 No wallet connected, routing to auth...');
        navigateToStep('auth');
        return;
      }

      if (result?.success && result?.accessToken) {
        console.log('🔍 Authentication successful, storing token...');
        setAccessToken(result.accessToken);
        toast({
          title: 'Authentication Successful',
          description: 'Connected to Gnosis Pay via cross-chain SIWE',
        });
        await refreshUserData?.();
      } else {
        throw new Error(result?.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('🔍 Authentication error:', error);
      toast({
        title: 'Authentication Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEarnClick = () => {
    setCurrentTab('earn');
  };

  const handleCardClick = () => {
    setCurrentTab('card');
  };

  if (currentTab === 'earn') {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader 
          title="Earn"
          subtitle="Stake your assets and earn rewards"
          showLogo
        />
        
        {/* Content */}
        <div className="mobile-container mobile-content pb-24 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Pools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-60">
                <div>
                  <p className="font-medium">USDT Pool</p>
                  <p className="text-sm text-muted-foreground">Kaia Network</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">8.5% APY</p>
                  <p className="text-xs text-muted-foreground">Variable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <BottomNavigation 
          currentTab="earn" 
          onCardClick={handleCardClick}
          onEarnClick={handleEarnClick}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Card"
        subtitle="Manage your stablecoin card"
        showLogo
        showWalletInfo={true}
        showProfile={true}
      />
      
      {/* Main Content */}
      <div className="mobile-container mobile-content pb-24 space-y-6">
        <Card className="text-center">
          <CardContent className="p-8">
            {/* Title */}
            <h1 className="text-3xl font-bold text-primary mb-4">
              Stablecoin Card
            </h1>
            
            {/* Description */}
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Spend your stablecoins anywhere, with the best FX rates and no hidden fees
            </p>
            
            {/* Access Button */}
            <Button 
              onClick={handleAccessClick}
              disabled={isLoading || isAuthenticated}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 text-lg rounded-full h-14 disabled:opacity-60"
            >
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full" />
                  Authenticated - Loading Dashboard...
                </div>
              ) : isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </div>
              ) : isLiff && isLineWalletConnected ? (
                'Access via Cross-Chain SIWE'
              ) : (
                'Access'
              )}
            </Button>
            
            {/* Show cross-chain SIWE info for LINE wallet */}
            {isLiff && isLineWalletConnected && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Cross-Chain Authentication:</strong> Your LINE wallet will sign a Gnosis Pay message off-chain. 
                  This enables full functionality while staying on Kaia network.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <BottomNavigation 
        currentTab="card" 
        onCardClick={handleCardClick}
        onEarnClick={handleEarnClick}
      />
    </div>
  );
}