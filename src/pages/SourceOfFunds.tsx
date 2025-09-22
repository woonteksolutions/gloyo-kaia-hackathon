import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Question {
  question: string;
  answers: string[];
}

interface Answer {
  question: string;
  answer: string;
}

export default function SourceOfFunds() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [error, setError] = useState('');
  
  const { toast } = useToast();
  const { user, updateUser, navigateToStep, isAuthenticated } = useGnosisPay();

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!isAuthenticated || !user) {
        console.error('User not authenticated for fetching source of funds questions');
        toast({
          title: 'Authentication Error',
          description: 'Please ensure you are properly authenticated.',
          variant: 'destructive',
        });
        return;
      }

      // Prerequisites: KYC approved and source of funds not answered
      if (user.kycStatus !== 'approved') {
        setError('KYC must be approved before completing source of funds questionnaire.');
        setIsLoadingQuestions(false);
        return;
      }

      if (user.isSourceOfFundsAnswered === true) {
        // User has already completed this step
        navigateToStep('phone-verification');
        return;
      }

      try {
        setIsLoadingQuestions(true);
        console.log('🔍 Fetching source of funds questions from Gnosis Pay API...');
        
        const response = await apiFetch<Question[]>('/source-of-funds');
        console.log('🔍 Source of funds questions fetched:', response);
        
        setQuestions(response);
        
        // Initialize answers array
        const initialAnswers = response.map((q: Question) => ({
          question: q.question,
          answer: ''
        }));
        setAnswers(initialAnswers);

      } catch (error) {
        console.error('🔍 Error fetching source of funds questions:', error);
        toast({
          title: 'Error Loading Questions',
          description: 'Failed to load source of funds questions. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [isAuthenticated, user, toast, navigateToStep]);

  const handleAnswerChange = (questionText: string, selectedAnswer: string) => {
    setAnswers(prev => 
      prev.map(a => 
        a.question === questionText 
          ? { ...a, answer: selectedAnswer }
          : a
      )
    );
  };

  const handleSubmitAnswers = async () => {
    // Validate all questions are answered
    const unansweredQuestions = answers.filter(a => !a.answer.trim());
    if (unansweredQuestions.length > 0) {
      setError('Please answer all questions before continuing.');
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Authentication Error',
        description: 'Please ensure you are properly authenticated.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      console.log('🔍 Submitting source of funds answers...');
      
      const response = await apiFetch('/source-of-funds', {
        method: 'POST',
        body: JSON.stringify(answers),
      });
      
      console.log('🔍 Source of funds answers submitted successfully');
      
      // Update user state locally (this will be persisted by context)
      updateUser({ isSourceOfFundsAnswered: true });
      
      toast({
        title: 'Source of Funds Completed',
        description: 'Your answers have been submitted successfully. Please verify your phone number.',
      });
      
      // Force immediate step progression to ensure persistence
      setTimeout(() => {
        navigateToStep('phone-verification');
      }, 100);
      
    } catch (error) {
      console.error('🔍 Error submitting source of funds answers:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit answers. Please try again.');
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit your answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Source of Funds"
        subtitle="Please answer a few questions about your funding sources for regulatory compliance"
        showBackButton
        onBack={() => navigateToStep('kyc')}
      />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <div className="max-w-md mx-auto space-y-6 fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-mobile-card">
              <FileText className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          {/* Loading State */}
          {isLoadingQuestions ? (
            <Card className="mobile-card">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Questions */}
              {questions.map((question, index) => (
                <Card key={index} className="mobile-card">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-mobile-xl leading-tight">
                      {question.question}
                    </CardTitle>
                    <CardDescription className="text-base">
                      Select the most appropriate answer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={answers.find(a => a.question === question.question)?.answer || ''}
                      onValueChange={(value) => handleAnswerChange(question.question, value)}
                    >
                      <div className="space-y-3">
                        {question.answers.map((answerOption, answerIndex) => (
                          <div key={answerIndex} className="flex items-start space-x-3 p-3 border-2 rounded-xl hover:border-primary/30 transition-colors">
                            <RadioGroupItem 
                              value={answerOption} 
                              id={`${index}-${answerIndex}`}
                              className="mt-1"
                            />
                            <Label 
                              htmlFor={`${index}-${answerIndex}`} 
                              className="flex-1 cursor-pointer text-base leading-relaxed"
                            >
                              {answerOption}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Card className="mobile-card bg-gradient-to-r from-card to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleSubmitAnswers}
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl font-medium text-base shadow-mobile-button"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Submit & Continue →
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}