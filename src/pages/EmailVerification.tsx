import { useState } from 'react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, CheckCircle } from 'lucide-react';
import { storeAuthFromResponse } from '@/auth/normalize';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { GNOSIS_PAY_CONFIG } from '@/config/gnosis-config';

export default function EmailVerification() {
  const { updateUser, navigateToStep, setAccessToken } = useGnosisPay();
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch('/signup/otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: 'Check your email for the verification code',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      toast({
        title: 'Error',
        description: 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Complete signup and get JWT token
      const signupResponse = await apiFetch('/signup', {
        method: 'POST',
        body: JSON.stringify({
          authEmail: email,
          otp,
        }),
      });

      console.log('🔍 Signup response:', signupResponse);

      // Store the JWT token from signup response
      const accessToken = storeAuthFromResponse(signupResponse);
      setAccessToken(accessToken);

      // User is now registered and authenticated, update context and move to terms
      updateUser({ email });
      navigateToStep('terms');
      
      toast({
        title: 'Success',
        description: 'Email verified successfully!',
      });
    } catch (err: any) {
      console.error('🔍 Signup error:', err);
      setError(err.message || 'Invalid verification code');
      toast({
        title: 'Error',
        description: 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    setStep('email');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Email Verification"
        subtitle="To issue your Gloyo Card, we partner with Gnosis Pay. For this, we'll need to create an account with your email."
        showBackButton
      />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <Card className="w-full max-w-md mobile-card shadow-mobile-elevated fade-in">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-mobile-card">
            {step === 'email' ? (
              <Mail className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Shield className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="text-mobile-xl">Email Verification</CardTitle>
          <CardDescription className="text-base">
            {step === 'email' 
              ? 'Enter your email address to get started with Gnosis Pay'
              : `Enter the 6-digit code sent to ${email}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'email' ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 text-base rounded-xl border-2 focus:border-primary/50"
                />
              </div>
              
              <Button 
                onClick={handleSendOTP}
                disabled={loading || !email.trim()}
                className="w-full h-12 rounded-xl font-medium text-base shadow-mobile-button"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Code...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Verification Code
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-mobile-lg font-semibold">Check Your Email</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We sent a 6-digit code to your email from team@gnosispay.com
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="otp" className="text-base font-medium">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border-2 focus:border-primary/50"
                />
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 rounded-xl font-medium text-base shadow-mobile-button"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verify Email
                    </div>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="w-full h-11 rounded-xl font-medium border-2"
                >
                  Resend Code
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}