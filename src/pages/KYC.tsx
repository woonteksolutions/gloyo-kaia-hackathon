import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { ArrowLeft, Shield, RefreshCw, CheckCircle, Smartphone, MessageCircle, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';

export default function KYC() {
  const [isLoading, setIsLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isMonitoringStatus, setIsMonitoringStatus] = useState(false);
  
  const { toast } = useToast();
  const { navigateToStep, updateUser, user, accessToken } = useGnosisPay();

  const startKYCVerification = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Starting KYC verification with Sumsub...');
      
      // Ensure user has valid authentication
      if (!accessToken) {
        throw new Error('No access token found. Please authenticate first.');
      }
      
      // Get Sumsub iframe URL from Gnosis Pay API
      const data = await apiFetch<any>('/kyc/integration');
      console.log('🔍 KYC integration response:', data);
      
      if (!data.url) {
        throw new Error('No Sumsub URL received from Gnosis Pay API');
      }
      
      // Validate URL before setting it
      try {
        new URL(data.url);
      } catch (urlError) {
        throw new Error('Invalid Sumsub URL received from API');
      }
      
      // Set the URL to display in iframe
      setKycUrl(data.url);
      
      toast({
        title: 'KYC Verification Started',
        description: 'Complete the identity verification process below.',
      });
      
    } catch (error) {
      console.error('🔍 Error starting KYC verification:', error);
      
      let errorMessage = 'Failed to start KYC process. Please try again.';
      
      if (error.message?.includes('jwt malformed') || error.message?.includes('401')) {
        errorMessage = 'Your session has expired. Please sign in again.';
      }
      
      toast({
        title: 'KYC Verification Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-start KYC Sumsub iframe based on official Gnosis Pay API documentation
  useEffect(() => {
    if (user?.kycStatus && accessToken) {
      // According to Gnosis Pay docs: auto-start Sumsub for these statuses
      const autoStartStatuses = ['documentsRequested', 'pending', 'processing'];
      
      if (autoStartStatuses.includes(user.kycStatus)) {
        console.log('🔍 User KYC in progress, auto-starting Sumsub iframe:', user.kycStatus);
        startKYCVerification();
      }
    }
  }, [user?.kycStatus, accessToken]);


  // Poll KYC status every 10 seconds when iframe is active
  useEffect(() => {
    if (!kycUrl) return;

    const checkKycStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const userData = await apiFetch<any>('/user');
        
        if (userData.registered && userData.user) {
          const newKycStatus = userData.user.kycStatus;
          
          if (newKycStatus === 'approved') {
            updateUser({ kycStatus: 'approved' });
            toast({
              title: 'KYC Verification Complete!',
              description: 'Your identity has been successfully verified.',
            });
            setKycUrl(null);
            // Context will automatically move to next step
          } else if (newKycStatus === 'rejected') {
            updateUser({ kycStatus: 'rejected' });
            setKycUrl(null);
            toast({
              title: 'KYC Verification Failed',
              description: 'Your verification was not approved. Please contact support.',
              variant: 'destructive',
            });
          } else if (newKycStatus === 'requiresAction') {
            updateUser({ kycStatus: 'requiresAction' });
            setKycUrl(null);
            toast({
              title: 'Action Required',
              description: 'Additional verification steps needed. Please contact support.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('🔍 Error checking KYC status:', error);
        // If we get auth errors, clear the iframe and show error
        if (error.message?.includes('401') || error.message?.includes('jwt malformed')) {
          console.error('🚨 Authentication failed in KYC polling, clearing iframe');
          setKycUrl(null);
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please sign in again.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsCheckingStatus(false);
      }
    };

    const interval = setInterval(checkKycStatus, 15000); // Increased to 15 seconds to reduce load
    return () => clearInterval(interval);
  }, [kycUrl, updateUser, toast]);

  const handleRetry = () => {
    setKycUrl(null);
  };


  const handleContactSupport = () => {
    // Open support contact (could be email, chat, etc.)
    window.open('mailto:support@gloyo.com?subject=KYC Verification Support&body=Hello, I need assistance with my KYC verification process.', '_blank');
    toast({
      title: 'Support Contact',
      description: 'Opening email to contact support team.',
    });
  };

  // Monitor KYC status on the main page (before iframe) - per Gnosis Pay documentation
  useEffect(() => {
    if (!accessToken || kycUrl) return; // Don't monitor if no token or iframe is active
    
    const monitorKycStatus = async () => {
      try {
        setIsMonitoringStatus(true);
        const userData = await apiFetch<any>('/user');
        
        if (userData.registered && userData.user) {
          const currentKycStatus = userData.user.kycStatus;
          
          // Update user status if it changed
          if (currentKycStatus !== user?.kycStatus) {
            updateUser({ kycStatus: currentKycStatus });
            
            // Handle status changes per Gnosis Pay requirements
            if (currentKycStatus === 'approved') {
              toast({
                title: 'KYC Verification Complete!',
                description: 'Your identity has been successfully verified.',
              });
              // Context will automatically move to next step
            } else if (currentKycStatus === 'rejected') {
              toast({
                title: 'KYC Verification Rejected',
                description: 'Please contact support for assistance.',
                variant: 'destructive',
              });
            } else if (currentKycStatus === 'requiresAction') {
              toast({
                title: 'Action Required',
                description: 'Additional verification steps needed.',
                variant: 'destructive',
              });
            }
          }
        }
      } catch (error) {
        console.error('🔍 Error monitoring KYC status:', error);
        if (error.message?.includes('401') || error.message?.includes('jwt malformed')) {
          console.error('🚨 Authentication failed in KYC monitoring');
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please sign in again.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsMonitoringStatus(false);
      }
    };

    // Monitor status every 30 seconds on the main KYC page
    const monitorInterval = setInterval(monitorKycStatus, 30000);
    
    // Initial check
    monitorKycStatus();
    
    return () => clearInterval(monitorInterval);
  }, [accessToken, user?.kycStatus, updateUser, toast, kycUrl]);

  if (kycUrl) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader 
          title="Identity Verification"
          subtitle={isCheckingStatus ? 'Checking status...' : 'Complete verification below'}
          showBackButton
          onBack={handleRetry}
        >
          {isCheckingStatus && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
        </AppHeader>
        
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Sumsub Iframe Container */}
          <div className="w-full max-w-4xl bg-card rounded-xl overflow-hidden shadow-mobile-card border" style={{ height: 'calc(100vh - 140px)' }}>
            <iframe
              src={kycUrl}
              className="w-full h-full border-0"
              frameBorder="0"
              title="KYC Verification"
              allow="camera; microphone; geolocation; document-domain; encrypted-media; fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-downloads allow-modals"
              referrerPolicy="origin-when-cross-origin"
              loading="eager"
              style={{
                minHeight: '600px',
                width: '100%',
                height: '100%'
              }}
              onError={(e) => {
                console.error('🚨 Iframe loading error:', e);
                toast({
                  title: 'Iframe Error',
                  description: 'Failed to load KYC verification. Please try again.',
                  variant: 'destructive',
                });
              }}
              onLoad={() => {
                console.log('✅ Sumsub iframe loaded successfully');
              }}
            />
        </div>
      </div>

    </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Identity Verification"
        subtitle="Complete KYC verification to activate your Gloyo access"
        showBackButton
        onBack={() => navigateToStep('auth')}
      />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5">
          {/* Icon Header */}
          <div className="text-center">
            <div className="mobile-icon-primary mx-auto relative">
              <Shield className="w-8 h-8 text-primary-foreground" />
              {isMonitoringStatus && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full">
                  <div className="w-3 h-3 bg-primary rounded-full animate-ping"></div>
                </div>
              )}
            </div>
            {isMonitoringStatus && (
              <p className="text-xs text-primary mt-2">Monitoring status...</p>
            )}
          </div>

          {/* Features List */}
          <Card className="mobile-card bg-gradient-to-r from-card to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                What You'll Need
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Government ID</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Camera access</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">5-10 minutes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Current Status */}
          {user?.kycStatus && (
            <Card className="mobile-card">
              <CardContent className="pt-4 pb-4">
                <div className="text-center space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">Current Status</p>
                  <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.kycStatus === 'approved' ? 'bg-success/10 text-success' : 
                    user.kycStatus === 'pending' || user.kycStatus === 'processing' ? 'bg-warning/10 text-warning' :
                    user.kycStatus === 'resubmissionRequested' || user.kycStatus === 'requiresAction' ? 'bg-destructive/10 text-destructive' :
                    user.kycStatus === 'rejected' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      user.kycStatus === 'approved' ? 'bg-success' : 
                      user.kycStatus === 'pending' || user.kycStatus === 'processing' ? 'bg-warning' :
                      user.kycStatus === 'resubmissionRequested' || user.kycStatus === 'requiresAction' ? 'bg-destructive' :
                      user.kycStatus === 'rejected' ? 'bg-destructive' :
                      'bg-muted-foreground'
                    }`} />
                    {user.kycStatus === 'resubmissionRequested' ? 'Resubmission Required' :
                     user.kycStatus === 'requiresAction' ? 'Action Required' :
                     user.kycStatus === 'documentsRequested' ? 'Documents Needed' :
                     user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1)}
                  </div>
                  
                  {/* Additional messaging for specific statuses */}
                  {user.kycStatus === 'resubmissionRequested' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Some verification steps need to be completed again
                    </p>
                  )}
                  {user.kycStatus === 'requiresAction' && (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive">
                        Additional information or documents are required
                      </p>
                      <Button
                        onClick={handleContactSupport}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Contact Support
                      </Button>
                    </div>
                  )}
                  {user.kycStatus === 'rejected' && (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive">
                        Verification was not approved. Contact support for assistance.
                      </p>
                      <Button
                        onClick={handleContactSupport}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Contact Support
                      </Button>
                    </div>
                  )}
                  {(user.kycStatus === 'pending' || user.kycStatus === 'processing') && (
                    <p className="text-xs text-muted-foreground">
                      Your verification is being processed. No action needed.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          <Button 
            onClick={startKYCVerification}
            className="w-full h-11 rounded-xl font-medium text-sm shadow-mobile-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting verification...
              </div>
            ) : user?.kycStatus === 'resubmissionRequested' || user?.kycStatus === 'requiresAction' ? (
              'Continue Verification →'
            ) : user?.kycStatus === 'rejected' ? (
              'Retry Verification →'
            ) : (
              'Start Identity Verification →'
            )}
          </Button>


        </div>
      </div>
    </div>
  );
}