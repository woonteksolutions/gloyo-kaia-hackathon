import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { GnosisApiService } from '@/services/gnosisApiService';
import { CreditCard, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';

export default function CardOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const { toast } = useToast();
  const { navigateToStep, updateUser, user, currentStep } = useGnosisPay();
  
  // Show back button if user has completed onboarding (accessing from dashboard)
  const showBackButton = user?.hasCard === true;

  const handleOrderCard = async () => {
    try {
      setIsLoading(true);
      
      // Use Gnosis Pay API to create virtual card
      const response = await GnosisApiService.createVirtualCard();
      
      console.log('Virtual card created:', response);
      
      updateUser({ hasCard: true });
      setOrderComplete(true);
      
      toast({
        title: 'Virtual Card Created!',
        description: 'Your virtual card has been created successfully and is ready to use.',
      });

    } catch (error) {
      console.error('Card creation failed:', error);
      toast({
        title: 'Order Failed',
        description: 'Failed to create virtual card. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigateToStep('dashboard');
  };

  const handleGoBack = () => {
    navigateToStep('dashboard');
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background w-screen">
        <AppHeader 
          title="Card Order"
          showBackButton={showBackButton}
          onBack={handleGoBack}
        />
        
        <main className="w-full px-6 pb-8">
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="w-full max-w-lg space-y-8 fade-in">
              <div className="text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center shadow-mobile-card">
                  <CheckCircle className="w-10 h-10 text-success" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Virtual Card Created!</h1>
                  <p className="text-muted-foreground mt-2">
                    Your virtual card is ready to use immediately
                  </p>
                </div>
              </div>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-success" />
                    </div>
                    <p className="text-sm">Your virtual card is now available in your dashboard</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-success" />
                    </div>
                    <p className="text-sm">Card details are securely stored and accessible in dashboard</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-success" />
                    </div>
                    <p className="text-sm">You can start using it for online purchases right away</p>
                  </div>
                </div>
                
                <Button onClick={handleContinue} className="w-full h-12 rounded-xl font-medium shadow-mobile-button" size="lg">
                  Go to Dashboard →
                </Button>
              </CardContent>
              </Card>
            </div>
        </div>
      </main>
    </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-screen">
      <AppHeader 
        title="Order Card"
        showBackButton={showBackButton}
        onBack={handleGoBack}
      />
      
      <main className="w-full flex justify-center px-6 pb-8">
        <div className="space-y-8 fade-in">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-mobile-card">
              <CreditCard className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Order Your Virtual Card</h1>
              <p className="text-muted-foreground">
                Get instant access for online purchases
              </p>
            </div>
          </div>

          {/* Virtual Card Info */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Virtual Card</CardTitle>
              <CardDescription>Perfect for online shopping and digital payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
                  <div className="w-16 h-16 bg-primary/20 rounded-3xl flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-primary" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Available immediately after ordering
                  </p>
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Perfect for online shopping
                  </p>
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> No shipping required
                  </p>
                  <p className="text-sm text-success flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Secure and encrypted
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="bg-gradient-to-r from-card to-primary/5 border-primary/20 border-none shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Card Type:</span>
                <span className="font-semibold">Virtual Card</span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Processing Fee:</span>
                <span className="font-semibold text-success">Free</span>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-2xl">$0.00</span>
                </div>
              </div>
              
              <Button 
                onClick={handleOrderCard} 
                className="w-full h-12 rounded-xl font-medium shadow-mobile-button mt-6" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Create Virtual Card →'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  );
}