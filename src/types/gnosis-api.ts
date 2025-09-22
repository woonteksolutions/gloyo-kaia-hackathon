// Gnosis Pay API Response Types

export interface UserResponse {
  id: string;
  email?: string;
  kycStatus: 'notStarted' | 'documentsRequested' | 'pending' | 'processing' | 'approved' | 'resubmissionRequested' | 'rejected' | 'requiresAction';
  isPhoneValidated?: boolean;
  sourceOfFunds?: string;
  isSourceOfFundsAnswered?: boolean;
  terms?: Array<{
    terms: string;
    version: string;
    accepted: boolean;
    acceptedAt?: string;
  }>;
  safeWallets?: Array<{
    address: string;
    chainId: number;
  }>;
  cards?: Array<{
    id: string;
    status: string;
  }>;
}

export interface TermsResponse {
  terms: Array<{
    terms: string;
    version: string;
    accepted: boolean;
    acceptedAt?: string;
  }>;
}

export interface KycStatusResponse {
  status: 'notStarted' | 'documentsRequested' | 'pending' | 'processing' | 'approved' | 'resubmissionRequested' | 'rejected' | 'requiresAction';
  documentsRequired?: string[];
  message?: string;
}

export interface AccountResponse {
  address?: string;
  chainId?: number;
  exists: boolean;
  accountStatus?: number;
}

export interface AccountStatusResponse {
  accountStatus: number; // 0 = deployed, 1 = invalid modules, 7 = pending
  address: string;
  isDeployed?: boolean;
  tokenSymbol?: string;
  fiatSymbol?: string;
}

export interface SafeConfigResponse {
  hasNoApprovals: boolean;
  isDeployed: boolean;
  address: string;
  tokenSymbol: string;
  fiatSymbol: string;
  accountStatus: number;
  accountAllowance: {
    balance: string;
    refill: string;
    period: string;
    nextRefill: string;
  };
}

export interface DeployModulesResponse {
  success: boolean;
  transactionHash?: string;
  accountStatus: number;
}

// Card Details Response
export interface CardDetailsResponse {
  id: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  holderName: string;
  type: 'VIRTUAL' | 'PHYSICAL';
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  balance: number;
  currency: string;
  cardBrand: 'VISA' | 'MASTERCARD' | 'GNOSIS';
  activatedAt?: string;
  isFrozen: boolean;
  isStolen: boolean;
  isLost: boolean;
  isBlocked: boolean;
  isVoid: boolean;
}

// Processed User State
export interface GnosisPayUser {
  id: string;
  email?: string;
  kycStatus: 'notStarted' | 'documentsRequested' | 'pending' | 'processing' | 'approved' | 'resubmissionRequested' | 'rejected' | 'requiresAction';
  isPhoneValidated: boolean;
  termsAccepted: boolean;
  isSourceOfFundsAnswered: boolean;
  safeAddress?: string;
  safeConfigured: boolean;
  hasCard: boolean;
}

// Onboarding Step Types
export type OnboardingStep = 
  | 'auth' 
  | 'email-verification' 
  | 'terms' 
  | 'kyc' 
  | 'source-of-funds' 
  | 'phone-verification' 
  | 'safe-setup' 
  | 'card-order' 
  | 'dashboard';

export interface OnboardingState {
  step: OnboardingStep;
  user: GnosisPayUser | null;
  isLoading: boolean;
  error?: string;
}