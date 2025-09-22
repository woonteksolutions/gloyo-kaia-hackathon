import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, Mail, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { useCDPWallet } from '@/hooks/useCDPWallet';

interface CDPAuthButtonProps {
  onSuccess: () => void;
}

export default function CDPAuthButton({ onSuccess }: CDPAuthButtonProps) {
  const { toast } = useToast();
  const { setAccessToken } = useGnosisPay();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpForm, setShowOtpForm] = useState(false);
  
  // Use our comprehensive CDP wallet hook
  const {
    isInitialized,
    isSignedIn,
    evmAddress,
    smartAccountAddress,
    isAuthenticating,
    isSigningIn,
    flowId,
    error,
    currentUser,
    startEmailSignIn,
    verifyOTP,
    disconnectWallet,
    authenticateWithGnosis,
    clearError
  } = useCDPWallet();

  console.log('CDP Auth State:', { isInitialized, isSignedIn, evmAddress });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    const result = await startEmailSignIn(email.trim());
    
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) return;
    
    const result = await verifyOTP(otp.trim());
    
    if (result.success) {
      setShowOtpForm(false);
      setEmail('');
      setOtp('');
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

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    
    if (result.success) {
      setShowOtpForm(false);
      setEmail('');
      setOtp('');
      toast({
        title: "Disconnected",
        description: "Your embedded wallet has been disconnected successfully",
      });
    } else {
      toast({
        title: "Disconnect Failed",
        description: result.error || "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGnosisAuth = async () => {
    clearError(); // Clear any previous errors
    
    const result = await authenticateWithGnosis();
    
    if (result.success && result.accessToken) {
      setAccessToken(result.accessToken);
      toast({
        title: "Authentication Successful",
        description: "Successfully authenticated with Gnosis Pay",
      });
      onSuccess();
    } else {
      toast({
        title: "Authentication Failed",
        description: result.error || "Failed to authenticate with Gnosis Pay",
        variant: "destructive",
      });
    }
  };

  // Show loading while CDP is initializing
  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Embedded Wallet
          </CardTitle>
          <CardDescription>
            Initializing embedded wallet...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Embedded Wallet
        </CardTitle>
        <CardDescription>
          Create a new wallet or sign in with email - powered by Coinbase
          {error && (
            <span className="block text-xs text-red-600 dark:text-red-400 mt-1">
              ⚠️ {error}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSignedIn ? (
          <div className="space-y-4">
            {!showOtpForm ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSigningIn}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSigningIn || !email.trim()}
                >
                  {isSigningIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSigningIn ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isSigningIn}
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Check your email for the 6-digit verification code
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isSigningIn || otp.length !== 6}
                  >
                    {isSigningIn && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isSigningIn ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowOtpForm(false);
                      setOtp('');
                      clearError();
                    }}
                    disabled={isSigningIn}
                  >
                    Back
                  </Button>
                </div>
              </form>
            )}
            
            {flowId && (
              <div className="text-xs text-blue-600 dark:text-blue-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
                💡 Code sent to {email}. Check your email and enter the 6-digit code above.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✅ Embedded wallet connected
              </p>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">EOA Address:</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
                    {evmAddress}
                  </p>
                </div>
                {smartAccountAddress && (
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Smart Account:</p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-mono break-all">
                      {smartAccountAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleGnosisAuth}
                disabled={isAuthenticating}
                className="flex-1"
              >
                {isAuthenticating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign with Gnosis Pay
              </Button>
              
              <Button 
                onClick={handleDisconnect}
                disabled={isAuthenticating}
                variant="outline"
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}