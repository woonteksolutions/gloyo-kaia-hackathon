import { useState, useEffect } from 'react';
import { ModernAuth } from '@/components/ui/modern-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEnvironmentDetection } from '@/hooks/useEnvironmentDetection';
import { useCDPWallet } from '@/hooks/useCDPWallet';
import { LogOut, MessageCircle, Share2, Wallet, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UnifiedEmbeddedAuthProps {
  // Platform-specific props
  platform: 'liff' | 'dappportal';
  
  // Platform login status
  isPlatformLoggedIn: boolean;
  platformEmail?: string;
  platformProfile?: any;
  
  // Platform actions
  onPlatformLogin: () => Promise<void> | void;
  onPlatformLogout: () => Promise<void> | void;
  
  // External wallet connection
  onExternalWallet?: () => void;
  
  // DappPortal wallet connection
  onDappPortalWallet?: () => void;
  isDappPortalWalletReady?: boolean;
  isDappPortalWalletConnected?: boolean;
  walletAddress?: string | null;
  
  // Platform-specific actions (for LIFF)
  onSendMessage?: () => void;
  onShare?: () => void;
  isInClient?: boolean;
  
  // Loading and error states
  isPlatformReady: boolean;
  platformError?: string;
  isSupportedBrowser?: boolean;
  skipEmbeddedWalletFlow?: boolean;
  onWalletConnected?: () => void;
}

export function UnifiedEmbeddedAuth({
  platform,
  isPlatformLoggedIn,
  platformEmail,
  platformProfile,
  onPlatformLogin,
  onPlatformLogout,
  onExternalWallet,
  onDappPortalWallet,
  isDappPortalWalletReady = false,
  isDappPortalWalletConnected = false,
  walletAddress,
  onSendMessage,
  onShare,
  isInClient,
  isPlatformReady,
  platformError,
  isSupportedBrowser = true,
  skipEmbeddedWalletFlow = false
}: UnifiedEmbeddedAuthProps) {
  const { isLiff, isDappPortal } = useEnvironmentDetection();
  const {
    isInitialized: isCDPInitialized,
    isSignedIn: isCDPSignedIn,
    evmAddress,
    smartAccountAddress,
    hasSmartAccount,
    isCreatingSmartAccount,
    isSigningIn,
    flowId,
    error: cdpError,
    currentUser,
    smartAccount,
    startEmailSignIn,
    verifyOTP,
    disconnectWallet,
    authenticateWithGnosis,
    createSmartAccountIfNeeded,
    clearError
  } = useCDPWallet();
  
  // Skip CDP initialization when embedded wallet flow is disabled
  const shouldUseCDP = !skipEmbeddedWalletFlow;
  
  // Get wallet states from LIFF hook if available
  const liffHook = platform === 'liff' ? 
    // We need to access the hook values, but we don't have direct access here
    // So we'll treat LINE wallet connection as equivalent to being signed in
    {} : {};
    
  // For LINE/DappPortal wallets: if platform is logged in AND wallet is connected = fully authenticated
  const isLineWalletConnected = isPlatformLoggedIn && isDappPortalWalletConnected;
  const isFullyAuthenticated = isCDPSignedIn || isLineWalletConnected;

  const [email, setEmail] = useState('');
  const [showOtpForm, setShowOtpForm] = useState(false);

  // Update email when platform email is available
  useEffect(() => {
    if (platformEmail) {
      setEmail(platformEmail);
    }
  }, [platformEmail]);

  const handleEmailSubmit = async (emailValue: string) => {
    const result = await startEmailSignIn(emailValue);
    if (result.success) {
      setShowOtpForm(true);
      toast({
        title: "Verification code sent",
        description: "Check your email for the verification code"
      });
    } else {
      toast({
        title: "Failed to send verification code",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleOtpSubmit = async (emailValue: string, otp: string) => {
    const result = await verifyOTP(otp);
    if (result.success) {
      setShowOtpForm(false);
      toast({
        title: "Wallet created successfully",
        description: "Your embedded wallet is ready to use"
      });
    } else {
      toast({
        title: "Verification failed",
        description: result.error,
        variant: "destructive"
      });
      throw new Error(result.error);
    }
  };

  const handleLogout = async () => {
    await disconnectWallet();
    await onPlatformLogout();
    setShowOtpForm(false);
  };

  const handleAuthenticateGnosis = async () => {
    const result = await authenticateWithGnosis();
    if (result.success) {
      toast({
        title: "Authentication successful",
        description: "Connected to Gnosis Pay"
      });
    } else {
      toast({
        title: "Authentication failed",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const handleBackToEmail = () => {
    setShowOtpForm(false);
  };

  // Show error states
  if (platformError) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardContent className="pt-6">
          <div className="text-sm text-destructive">
            {platform === 'liff' ? 'LIFF' : 'DappPortal'} Error: {platformError}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cdpError) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardContent className="pt-6">
          <div className="text-sm text-destructive mb-4">
            Wallet Error: {cdpError}
          </div>
          <Button onClick={clearError} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading states
  if (!isPlatformReady || (!isCDPInitialized && shouldUseCDP)) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {platform === 'liff' ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
            Initializing {platform === 'liff' ? 'LIFF' : 'DappPortal'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Loading...
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Browser not supported (for DappPortal)
  if (platform === 'dappportal' && !isSupportedBrowser) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader>
          <CardTitle className="text-destructive">Browser Not Supported</CardTitle>
          <CardDescription>
            Please use a supported browser to access this application
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Platform not logged in - show platform login and external wallet option (but not for LIFF/DappPortal)
  if (!isPlatformLoggedIn) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {platform === 'liff' ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
            {platform === 'liff' ? 'LINE Authentication Required' : 'DappPortal Login'}
          </CardTitle>
          <CardDescription>
            {platform === 'liff' 
              ? 'Sign in with LINE to continue'
              : 'Login via Mini Dapp Portal to continue'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onPlatformLogin} className="w-full">
            {platform === 'liff' ? 'Login with LINE' : 'Login via DappPortal'}
          </Button>
          
          {/* Show wallet connection options for LIFF and DappPortal */}
          {(platform === 'liff' || platform === 'dappportal') && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Connect wallet to continue
                  </span>
                </div>
              </div>
              
              {/* DappPortal wallet option - Primary for LIFF */}
              {onDappPortalWallet && isDappPortalWalletReady && (
                <Button 
                  onClick={onDappPortalWallet} 
                  className="w-full"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Connect {platform === 'liff' ? 'LINE' : 'DappPortal'} Wallet
                </Button>
              )}
              
              {/* External wallet option - Secondary */}
              {onExternalWallet && (
                <Button 
                  onClick={onExternalWallet} 
                  variant="outline" 
                  className="w-full"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect External Wallet
                </Button>
              )}
              
              <div className="text-center text-xs text-muted-foreground">
                {platform === 'liff' ? 'LINE wallet recommended for best experience' : 'Choose your preferred wallet'}
              </div>
            </>
          )}
          
          {/* Only show external wallet option for web platform */}
          {onExternalWallet && platform !== 'liff' && platform !== 'dappportal' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={onExternalWallet} 
                variant="outline" 
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect External Wallet
              </Button>
              
              <div className="text-center text-xs text-muted-foreground">
                MetaMask, WalletConnect, Coinbase & more
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Both platform and CDP are authenticated OR LINE wallet is connected - show connected state
  if ((isPlatformLoggedIn && isCDPSignedIn && evmAddress) || isFullyAuthenticated) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connected {isLineWalletConnected ? 'via LINE Wallet' : (!smartAccount && !smartAccountAddress && "(Creating Smart Account...)")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show wallet info differently for LINE vs CDP wallets */}
          {isLineWalletConnected ? (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">LINE Wallet Connected</p>
              <p className="text-xs font-mono break-all">{walletAddress}</p>
              <p className="text-xs text-muted-foreground mt-1">Ready for Kaia blockchain transactions</p>
            </div>
          ) : (
            <>
              {/* Wallet Address */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">EOA Address</p>
                <p className="text-xs font-mono break-all">{evmAddress}</p>
              </div>

              {/* Smart Account Address */}
              {(smartAccount || smartAccountAddress) && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Smart Account</p>
                  <p className="text-xs font-mono break-all">{smartAccount || smartAccountAddress}</p>
                  <p className="text-xs text-muted-foreground mt-1">ERC-4337 smart account with paymaster support</p>
                </div>
              )}

              {/* Smart Account Creation Button - only show if no smart account exists */}
              {!smartAccount && !smartAccountAddress && !isCreatingSmartAccount && (
                <Button 
                  onClick={createSmartAccountIfNeeded} 
                  variant="outline" 
                  className="w-full"
                  disabled={isCreatingSmartAccount}
                >
                  Check Smart Account Status
                </Button>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Only show Gnosis Pay connection for non-LINE wallets for now */}
            {!isLineWalletConnected && (
              <Button onClick={handleAuthenticateGnosis} className="flex-1">
                Connect to Gnosis Pay
              </Button>
            )}
            
            {/* LIFF-specific actions */}
            {platform === 'liff' && isInClient && (
              <>
                {onSendMessage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSendMessage}
                    className="h-9 w-9 p-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}
                {onShare && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onShare}
                    className="h-9 w-9 p-0"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-9 w-9 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Platform logged in but no wallet connected - show wallet connection options 
  // For LIFF with skipEmbeddedWalletFlow, we only show wallet connection (no CDP)
  if (isPlatformLoggedIn && !isDappPortalWalletConnected && (skipEmbeddedWalletFlow || !isCDPSignedIn)) {
    return (
      <Card className="mobile-card border-0 shadow-mobile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </CardTitle>
          <CardDescription>
            Choose a wallet connection method to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* DappPortal wallet option - Primary for LIFF */}
          {onDappPortalWallet && isDappPortalWalletReady && (
            <Button 
              onClick={onDappPortalWallet} 
              className="w-full"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Connect {platform === 'liff' ? 'LINE' : 'DappPortal'} Wallet
            </Button>
          )}
          
          {/* External wallet option - Secondary */}
          {onExternalWallet && (
            <Button 
              onClick={onExternalWallet} 
              variant="outline" 
              className="w-full"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect External Wallet
            </Button>
          )}
          
          <div className="text-center text-xs text-muted-foreground">
            {platform === 'liff' ? 'LINE wallet recommended for best experience' : 'Choose your preferred wallet'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}