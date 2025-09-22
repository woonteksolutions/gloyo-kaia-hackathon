import { GnosisApiService } from './gnosisApiService';
import { GnosisPayUser, OnboardingStep, UserResponse } from '@/types/gnosis-api';

/**
 * Onboarding Flow Service
 * Implements the official Gnosis Pay onboarding flow logic
 */
export class OnboardingFlowService {
  
  /**
   * Check user's current progress and determine next step
   * Follows the official Gnosis Pay onboarding flow
   */
  static async checkUserProgress(): Promise<{
    user: GnosisPayUser | null;
    currentStep: OnboardingStep;
    error?: string;
  }> {
    try {
      // Skip token verification - just proceed to user data fetch
      // The API will return 401 if token is invalid

      // Check user registration
      let userData: UserResponse;
      try {
        userData = await GnosisApiService.getUser();
      } catch (error: any) {
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          return { user: null, currentStep: 'auth', error: 'Authentication required' };
        }
        // For other errors (network issues, server errors), don't assume user needs registration
        // Return auth step to maintain current state and let user retry
        throw new Error(`Failed to fetch user data: ${error.message}`);
      }

      // Convert API response to internal user format
      const user = await this.processUserData(userData);

      // Determine current step based on user status
      const currentStep = this.determineCurrentStep(user);

      return { user, currentStep };

    } catch (error: any) {
      return {
        user: null,
        currentStep: 'auth',
        error: error.message
      };
    }
  }

  /**
   * Process raw API user data into internal format
   */
  private static async processUserData(userData: UserResponse): Promise<GnosisPayUser> {
    console.log('🔍 Processing user data:', userData);
    
    // Check Terms of Service acceptance using dedicated terms endpoint
    let termsAccepted = false;
    try {
      const termsResponse = await GnosisApiService.getTerms();
      console.log('🔍 Terms response:', termsResponse);
      
      // Terms are accepted only if all terms in the response are marked as accepted
      termsAccepted = termsResponse.terms && 
                     termsResponse.terms.length > 0 && 
                     termsResponse.terms.every(term => term.accepted);
      
      console.log('🔍 Terms accepted (from /user/terms):', termsAccepted);
    } catch (error) {
      console.log('🔍 Failed to fetch terms status, assuming not accepted:', error);
      termsAccepted = false;
    }

    // Check Source of Funds (boolean conversion)
    const isSourceOfFundsAnswered = userData.isSourceOfFundsAnswered === true;

    // Check Safe configuration
    let safeConfigured = false;
    const safeAddress = userData.safeWallets?.[0]?.address;

    if (safeAddress) {
      try {
        const accountStatus = await GnosisApiService.getAccountStatus();
        // Safe is configured if accountStatus is 0 (deployed) or 7 (pending)
        safeConfigured = accountStatus.accountStatus === 0 || accountStatus.accountStatus === 7;
      } catch (error) {
        // If we can't check status, assume not configured
        safeConfigured = false;
      }
    }

    return {
      id: userData.id,
      email: userData.email,
      kycStatus: userData.kycStatus,
      isPhoneValidated: userData.isPhoneValidated || false,
      termsAccepted,
      isSourceOfFundsAnswered,
      safeAddress,
      safeConfigured,
      hasCard: (userData.cards && userData.cards.length > 0) || false
    };
  }

  /**
   * Determine current step based on user completion status
   * Follows official Gnosis Pay flow order
   */
  static determineCurrentStep(user: GnosisPayUser): OnboardingStep {
    console.log('🔍 Determining current step for user:', user);
    
    // Step 1: Email verification (registration)
    if (!user.email) {
      console.log('🔍 No email -> email-verification step');
      return 'email-verification';
    }

    // Step 2: Terms of Service acceptance
    if (!user.termsAccepted) {
      console.log('🔍 Terms not accepted -> terms step');
      return 'terms';
    }

    // Step 3: KYC process - only show if not approved
    if (user.kycStatus !== 'approved') {
      return 'kyc';
    }

    // Step 4: Source of Funds (only after KYC approval)
    if (!user.isSourceOfFundsAnswered) {
      return 'source-of-funds';
    }

    // Step 5: Phone verification (only after KYC approval)
    if (!user.isPhoneValidated) {
      return 'phone-verification';
    }

    // Step 6: Safe setup (address + module deployment)
    if (!user.safeAddress || !user.safeConfigured) {
      return 'safe-setup';
    }

    // Step 7: Card ordering
    if (!user.hasCard) {
      return 'card-order';
    }

    // Step 8: Dashboard (all steps complete)
    return 'dashboard';
  }

  /**
   * Check if user can navigate to a specific step
   */
  static canNavigateToStep(user: GnosisPayUser, targetStep: OnboardingStep): boolean {
    const currentStep = this.determineCurrentStep(user);
    const stepOrder: OnboardingStep[] = [
      'auth',
      'email-verification',
      'terms',
      'kyc',
      'source-of-funds',
      'phone-verification',
      'safe-setup',
      'card-order',
      'dashboard'
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(targetStep);

    // Special cases for completed users
    if (currentStep === 'dashboard') {
      // From dashboard, users can go back to card-order to order more cards
      // or navigate to any completed step
      return targetStep === 'card-order' || targetIndex <= currentIndex;
    }

    // During onboarding: Can only navigate forward or to current step, or to dashboard
    return targetIndex >= currentIndex || targetStep === 'dashboard';
  }
}