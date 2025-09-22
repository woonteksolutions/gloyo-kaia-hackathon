import { useState, useEffect } from 'react';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';

export default function PhoneVerification() {
  const { user, updateUser, navigateToStep } = useGnosisPay();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check prerequisites on component mount
  useEffect(() => {
    if (!user) return;
    
    // Prerequisites: KYC approved and phone not validated
    if (user.kycStatus !== 'approved') {
      setError('KYC must be approved before phone verification');
      return;
    }
    
    if (user.isPhoneValidated === true) {
      // User has already completed this step
      navigateToStep('safe-setup');
      return;
    }
  }, [user, navigateToStep]);

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch('/verification', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });

      setStep('otp');
      toast({
        title: 'OTP Sent',
        description: 'Check your phone for the verification code',
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
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiFetch('/verification/check', {
        method: 'POST',
        body: JSON.stringify({ code: otp }),
      });

      // Update user context and move to next step
      updateUser({ isPhoneValidated: true });
      navigateToStep('safe-setup');
      
      toast({
        title: 'Success',
        description: 'Phone verified successfully!',
      });
    } catch (err: any) {
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
    setStep('phone');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Phone Verification"
        subtitle="Verify your phone number to secure your account"
        showBackButton
      />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <Card className="w-full max-w-md mobile-card shadow-mobile-elevated fade-in">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-mobile-card">
            <Phone className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-mobile-xl">Phone Verification</CardTitle>
          <CardDescription className="text-base">
            {step === 'phone' 
              ? 'Enter your phone number to receive a verification code'
              : `Enter the 6-digit code sent to ${phoneNumber}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-base font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="h-12 text-base rounded-xl border-2 focus:border-primary/50"
                />
              </div>
              
              <Button 
                onClick={handleSendOTP}
                disabled={loading || !phoneNumber.trim()}
                className="w-full h-12 rounded-xl font-medium text-base shadow-mobile-button"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Code...
                  </div>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-mobile-lg font-semibold">Enter Verification Code</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check your phone for the 6-digit code
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
                      <Shield className="w-4 h-4" />
                      Verify Phone
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