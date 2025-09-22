import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { FileText, Check, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { AppHeader } from '@/components/layout/AppHeader';

interface GnosisTermsItem {
  type: string;
  currentVersion: string;
  accepted: boolean;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  url: string;
}

export default function Terms() {
  const [terms, setTerms] = useState<GnosisTermsItem[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);
  const { toast } = useToast();
  const { accessToken, navigateToStep, updateUser } = useGnosisPay();

  // Map term types to user-friendly titles
  const tosToTitle: Record<string, string> = {
    "general-tos": "Gnosis Pay Terms of Service",
    "card-monavate-tos": "Cardholder Terms of Service",
    "cashback-tos": "Cashback Terms of Service",
  };

  useEffect(() => {
    const fetchTerms = async () => {
      if (!accessToken) {
        console.error('No access token available for fetching terms');
        toast({
          title: 'Authentication Error',
          description: 'Please ensure you are properly authenticated.',
          variant: 'destructive',
        });
        return;
      }

      try {
        setIsLoadingTerms(true);
        console.log('🔍 Fetching terms from Gnosis Pay API...');
        
        const response = await apiFetch<{ terms: GnosisTermsItem[] }>('/user/terms');
        console.log('🔍 Terms fetched successfully:', response);
        
        setTerms(response.terms);
        
        // Set already accepted terms
        const alreadyAccepted = new Set<string>(
          response.terms.filter((term: GnosisTermsItem) => term.accepted).map((term: GnosisTermsItem) => term.type)
        );
        setAcceptedTerms(alreadyAccepted);

      } catch (error) {
        console.error('🔍 Error fetching terms:', error);
        toast({
          title: 'Error Loading Terms',
          description: 'Failed to load terms of service. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTerms(false);
      }
    };

    fetchTerms();
  }, [accessToken, toast]);

  const handleTermToggle = (termType: string, checked: boolean) => {
    const newAccepted = new Set(acceptedTerms);
    if (checked) {
      newAccepted.add(termType);
    } else {
      newAccepted.delete(termType);
    }
    setAcceptedTerms(newAccepted);
  };

  const handleAcceptTerms = async () => {
    const unacceptedTerms = terms.filter(term => !term.accepted && acceptedTerms.has(term.type));
    
    if (unacceptedTerms.length === 0) {
      toast({
        title: 'No Changes',
        description: 'All required terms are already accepted.',
      });
      navigateToStep('kyc');
      return;
    }

    if (!accessToken) {
      toast({
        title: 'Authentication Error',
        description: 'Please ensure you are properly authenticated.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Submitting terms acceptance...');
      
      // Submit each unaccepted term that user has checked
      for (const term of unacceptedTerms) {
        console.log(`🔍 Accepting term: ${term.type} version ${term.currentVersion}`);
        
        await apiFetch('/user/terms', {
          method: 'POST',
          body: JSON.stringify({
            terms: term.type,
            version: term.currentVersion
          }),
        });

        console.log(`🔍 Successfully accepted term: ${term.type}`);
      }
      
      updateUser({ termsAccepted: true });
      navigateToStep('kyc');
      
      toast({
        title: 'Terms Accepted',
        description: 'Terms of service accepted successfully. Please complete identity verification.',
      });
    } catch (error) {
      console.error('🔍 Error accepting terms:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept terms. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unacceptedTerms = terms.filter(term => !term.accepted);
  const newAcceptedCount = Array.from(acceptedTerms).filter(type => 
    terms.some(term => term.type === type && !term.accepted)
  ).length;

  return (
    <div className="min-h-screen bg-background w-screen">
      <AppHeader 
        title="Terms of Service"
        subtitle="Please review and accept the terms to continue"
        showBackButton
      />
      
      <div className="w-full flex justify-center px-6 pb-8">
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="max-w-4xl w-full space-y-6">
            {/* Icon Header */}
            <div className="text-center">
              <div className="mobile-icon-primary mx-auto">
                <FileText className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>

        {/* Loading State */}
        {isLoadingTerms ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading terms of service...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Terms List */}
            <div className="space-y-4">
              {terms.map((term, index) => (
                <Card key={term.type} className={`mobile-card transition-all duration-200 ${term.accepted ? 'bg-success/5 border-success/20' : 'hover:shadow-mobile-elevated'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <CardTitle className="text-lg flex items-center gap-3 leading-tight">
                          {tosToTitle[term.type] || term.type}
                          <a 
                            href={term.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </CardTitle>
                        <CardDescription className={`text-base ${term.accepted ? "text-success font-medium" : "text-muted-foreground"}`}>
                          {term.accepted ? (
                            <span className="flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Already accepted (v{term.acceptedVersion})
                            </span>
                          ) : (
                            `Version: ${term.currentVersion} - Required`
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center">
                        {!term.accepted ? (
                          <Checkbox
                            id={term.type}
                            checked={acceptedTerms.has(term.type)}
                            onCheckedChange={(checked) => 
                              handleTermToggle(term.type, checked as boolean)
                            }
                            className="w-6 h-6"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-success" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl">
                      <p className="font-medium mb-2">📄 Full document available at link above</p>
                      <p className="text-xs opacity-75 break-all">{term.url}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Accept Button */}
            <Card className="mobile-card bg-gradient-to-r from-card to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    {unacceptedTerms.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 text-success font-semibold">
                        <Check className="w-5 h-5" />
                        All terms are accepted
                      </div>
                    ) : newAcceptedCount > 0 ? (
                      <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                        <FileText className="w-5 h-5" />
                        {newAcceptedCount} term(s) selected for acceptance
                      </div>
                    ) : (
                      <p className="text-base text-muted-foreground">
                        Please accept {unacceptedTerms.length} required terms to continue
                      </p>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleAcceptTerms}
                    disabled={isLoading}
                    variant="mobile"
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : unacceptedTerms.length === 0 ? (
                      'Continue to KYC →'
                    ) : (
                      'Accept Terms & Continue →'
                    )}
                  </Button>
                </div>
              </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

    </div>
    </div>
  );
}