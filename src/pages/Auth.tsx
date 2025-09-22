import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard } from "lucide-react";
import { Mail } from "lucide-react";
import { useGnosisPay } from "@/contexts/GnosisPayContext";
import { useGnosisAuth } from "@/hooks/useGnosisAuth";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useToast } from "@/hooks/use-toast";
import { WalletStatusIndicator } from "@/components/WalletStatusIndicator";
import CDPAuthButton from "@/components/CDPAuthButton";
import { ConditionalAuth } from "@/components/ConditionalAuth";
import { useEnvironmentDetection } from "@/hooks/useEnvironmentDetection";
import { ModernAuth } from "@/components/ui/modern-auth";
import { useCDPWallet } from "@/hooks/useCDPWallet";
import { AppHeader } from "@/components/layout/AppHeader";

export default function Auth() {
  const [step, setStep] = useState<'connect' | 'authenticate'>('connect');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [authMode, setAuthMode] = useState<'select' | 'embedded' | 'external'>('select');
  
  // Check URL parameters for wallet type preference
  const urlParams = new URLSearchParams(window.location.search);
  const walletParam = urlParams.get('wallet');
  const forceWalletType = walletParam === 'embedded' ? 'embedded' : walletParam === 'external' ? 'external' : null;
  
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { toast } = useToast();
  const { setAccessToken, navigateToStep, updateUser } = useGnosisPay();
  const { environment, isLiff, isDappPortal } = useEnvironmentDetection();
  const { 
    authenticateWithGnosis, 
    isAuthenticating, 
    disconnectWallet, 
    clearAuthData,
    isWalletResponsive,
    walletError
  } = useGnosisAuth();
  
  // CDP wallet hook for embedded wallet functionality
  const {
    isInitialized: isCDPInitialized,
    isSignedIn: isCDPSignedIn,
    evmAddress: cdpAddress,
    smartAccountAddress,
    isSigningIn,
    flowId,
    error: cdpError,
    startEmailSignIn,
    verifyOTP,
    disconnectWallet: disconnectCDPWallet,
    authenticateWithGnosis: cdpAuthenticateWithGnosis,
    clearError: clearCDPError
  } = useCDPWallet();

  // Clear any cached data on component mount
  useState(() => {
    clearAuthData();
  });

  const handleWalletConnect = () => {
    open();
  };

  const handleAuthenticate = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Starting authentication...');
      
      const result = await authenticateWithGnosis();
      
      if (result.success && result.accessToken) {
        console.log('🔍 Authentication successful, storing token...');
        
        // Store the access token in context
        setAccessToken(result.accessToken);
        
        // Let the refactored onboarding service handle the rest
        // The context will automatically fetch user data and determine the correct step
        
        toast({
          title: 'Authentication Successful', 
          description: 'Checking your account status...',
        });
        
      } else {
        throw new Error(result.error || 'Authentication failed');
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

  // Handle embedded wallet email submission
  const handleEmailSubmit = async (email: string) => {
    const result = await startEmailSignIn(email);
    if (result.success) {
      setShowOtpForm(true);
      toast({
        title: "Check Your Email",
        description: "We've sent a 6-digit code to your email address.",
      });
    } else {
      toast({
        title: "Sign In Failed",
        description: result.error || "Failed to start sign-in process. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (email: string, otp: string) => {
    const result = await verifyOTP(otp);
    if (result.success) {
      setShowOtpForm(false);
      toast({
        title: result.isNewUser ? "Welcome!" : "Welcome Back!",
        description: "Successfully signed in to your embedded wallet.",
      });
    } else {
      toast({
        title: "Verification Failed",
        description: result.error || "Invalid OTP code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle Gnosis authentication for embedded wallet
  const handleEmbeddedGnosisAuth = async () => {
    try {
      setIsLoading(true);
      const result = await cdpAuthenticateWithGnosis();
      if (result.success && result.accessToken) {
        setAccessToken(result.accessToken);
        toast({
          title: "Authentication Successful",
          description: "Successfully authenticated with Gnosis Pay",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Failed to authenticate with Gnosis Pay",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with Gnosis Pay",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle different auth flows based on environment and preferences
  const renderAuthFlow = () => {
    // LIFF or DappPortal environments use their specific flows
    if (isLiff || isDappPortal) {
      return <ConditionalAuth onExternalWalletConnect={handleWalletConnect} />;
    }

    // Force specific wallet type if URL parameter is set
    if (forceWalletType === 'external') {
      return (
        <ModernAuth
          title="Connect External Wallet"
          subtitle="Connect your existing Web3 wallet"
          mode="wallet-connect"
          onWalletConnect={handleWalletConnect}
          isLoading={isLoading}
          showWalletConnect={true}
          showGoogleSignIn={false}
          logo={{
            src: "/gloyo-uploads/gloyo-logo.png",
            alt: "Gloyo",
            title: "Gloyo"
          }}
        />
      );
    }

    if (forceWalletType === 'embedded') {
      if (isCDPSignedIn && cdpAddress) {
        // Show connected state for embedded wallet
        return (
          <div className="min-h-screen bg-background w-screen">
          <AppHeader 
            title="Welcome to Gloyo"
            subtitle="Complete your setup"
            showActions={true}
          />
            <main className="w-full px-6 pb-8">
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Embedded Wallet Connected
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm font-medium mb-1">EOA Address</p>
                    <p className="text-xs font-mono break-all">{cdpAddress}</p>
                  </div>
                  {smartAccountAddress && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium mb-1">Smart Account</p>
                      <p className="text-xs font-mono break-all">{smartAccountAddress}</p>
                      <p className="text-xs text-muted-foreground mt-1">ERC-4337 smart account with paymaster support</p>
                    </div>
                  )}
                  <Button 
                    onClick={handleEmbeddedGnosisAuth}
                    disabled={isLoading || isSigningIn}
                    className="w-full"
                  >
                    {isLoading || isSigningIn ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting to Gnosis Pay...
                      </div>
                    ) : (
                      'Connect to Gnosis Pay'
                    )}
                  </Button>
                  <Button 
                    onClick={disconnectCDPWallet}
                    variant="outline"
                    className="w-full"
                  >
                    Disconnect
                  </Button>
                </CardContent>
              </Card>
            </div>
            </main>
          </div>
        );
      }

      return (
        <ModernAuth
          title="Create Embedded Wallet"
          subtitle="Sign in with email to create your wallet"
          mode="email-otp"
          onEmailSubmit={handleEmailSubmit}
          onOtpSubmit={handleOtpSubmit}
          isLoading={isSigningIn}
          error={cdpError}
          showOtpForm={showOtpForm}
          showGoogleSignIn={false}
          showExternalWallet={true}
          onExternalWallet={handleWalletConnect}
          onBackClick={() => setShowOtpForm(false)}
          logo={{
            src: "/gloyo-uploads/gloyo-logo.png",
            alt: "Gloyo",
            title: "Gloyo"
          }}
        />
      );
    }

    // External wallet is connected - show authenticate option
    if (isConnected && address) {
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Ready to proceed with Gnosis Pay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WalletStatusIndicator />
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                <p className="text-sm text-center font-medium text-primary">
                  ✓ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="w-full h-8 text-xs rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                >
                  Disconnect Wallet
                </Button>
              </div>
              <Button
                onClick={handleAuthenticate}
                className="w-full"
                disabled={isLoading || isAuthenticating}
              >
                {isLoading || isAuthenticating ? 'Authenticating...' : 'Sign in with Gloyo'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Default: Show embedded wallet creation directly
    if (isCDPSignedIn && cdpAddress) {
      // Show connected state for embedded wallet
      return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Embedded Wallet Connected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium mb-1">EOA Address</p>
                <p className="text-xs font-mono break-all">{cdpAddress}</p>
              </div>
              {smartAccountAddress && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium mb-1">Smart Account</p>
                  <p className="text-xs font-mono break-all">{smartAccountAddress}</p>
                  <p className="text-xs text-muted-foreground mt-1">ERC-4337 smart account with paymaster support</p>
                </div>
              )}
              <Button 
                onClick={handleEmbeddedGnosisAuth}
                disabled={isLoading || isSigningIn}
                className="w-full"
              >
                {isLoading || isSigningIn ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting to Gnosis Pay...
                  </div>
                ) : (
                  'Connect to Gnosis Pay'
                )}
              </Button>
              <Button 
                onClick={disconnectCDPWallet}
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <ModernAuth
        title="Welcome to Gloyo"
        subtitle="Sign in with email to create your embedded wallet"
        mode="email-otp"
        onEmailSubmit={handleEmailSubmit}
        onOtpSubmit={handleOtpSubmit}
        isLoading={isSigningIn}
        error={cdpError}
        showOtpForm={showOtpForm}
        showGoogleSignIn={false}
        showExternalWallet={true}
        onExternalWallet={handleWalletConnect}
        onBackClick={() => setShowOtpForm(false)}
        logo={{
          src: "/gloyo-uploads/gloyo-logo.png",
          alt: "Gloyo",
          title: "Gloyo"
        }}
      />
    );
  };

  // Show embedded wallet creation flow when selected
  if (authMode === 'embedded') {
    if (isCDPSignedIn && cdpAddress) {
      // Show connected state for embedded wallet
      return (
        <div className="min-h-screen bg-background w-screen">
          <AppHeader 
            title="Welcome to Gloyo"
            subtitle="Complete your setup"
            showActions={true}
          />
          <main className="w-full px-6 pb-8">
            <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
              <Card className="w-full max-w-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Embedded Wallet Connected
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm font-medium mb-1">EOA Address</p>
                    <p className="text-xs font-mono break-all">{cdpAddress}</p>
                  </div>
                  {smartAccountAddress && (
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-sm font-medium mb-1">Smart Account</p>
                      <p className="text-xs font-mono break-all">{smartAccountAddress}</p>
                      <p className="text-xs text-muted-foreground mt-1">ERC-4337 smart account with paymaster support</p>
                    </div>
                  )}
                  <Button 
                    onClick={handleEmbeddedGnosisAuth}
                    disabled={isLoading || isSigningIn}
                    className="w-full"
                  >
                    {isLoading || isSigningIn ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting to Gnosis Pay...
                      </div>
                    ) : (
                      'Connect to Gnosis Pay'
                    )}
                  </Button>
                  <Button 
                    onClick={disconnectCDPWallet}
                    variant="outline"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      );
    }

    return (
      <ModernAuth
        title="Create Email Wallet"
        subtitle="Sign in with email to create your embedded wallet"
        mode="email-otp"
        onEmailSubmit={handleEmailSubmit}
        onOtpSubmit={handleOtpSubmit}
        isLoading={isSigningIn}
        error={cdpError}
        showOtpForm={showOtpForm}
        showGoogleSignIn={false}
        showExternalWallet={true}
        onExternalWallet={handleWalletConnect}
        onBackClick={() => {
          if (showOtpForm) {
            setShowOtpForm(false);
          } else {
            setAuthMode('select');
          }
        }}
        logo={{
          src: "/gloyo-uploads/gloyo-logo.png",
          alt: "Gloyo",
          title: "Gloyo"
        }}
      />
    );
  }

  // Determine if user is in an authenticated state (wallet connected or signed in)
  const isAuthenticated = (isConnected && address) || (isCDPSignedIn && cdpAddress);

  return (
    <div className="min-h-screen bg-background w-screen">
      {isAuthenticated && (
        <AppHeader 
          title="Welcome to Gloyo"
          subtitle="Complete your setup"
          showActions={true}
        />
      )}
      
      <main className={isAuthenticated ? "w-full flex justify-center px-6 pb-8" : ""}>
        {renderAuthFlow()}
        
        {/* Wallet responsiveness warning */}
        {walletError && (
          <div className="fixed bottom-4 left-4 right-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl max-w-md mx-auto">
            <p className="text-sm text-destructive text-center font-medium">
              {walletError}
            </p>
            <Button
              onClick={disconnectWallet}
              variant="outline"
              size="sm"
              className="w-full mt-3 h-8 text-xs border-destructive/20 text-destructive hover:bg-destructive/10"
            >
              Try Another Wallet
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}