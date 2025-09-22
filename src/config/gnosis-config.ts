/**
 * Centralized Gnosis Pay Configuration
 * Based on: https://docs.gnosispay.com/onboarding-flow
 */

// Base URLs from official documentation
export const GNOSIS_PAY_CONFIG = {
  // Production API base URL (from docs)
  API_BASE_URL: 'https://api.gnosispay.com',
  
  // API version
  API_VERSION: 'v1',
  
  // Partner ID - REQUIRED for user registration
  PARTNER_ID: process.env.GNOSIS_PAY_PARTNER_ID || 'sample-partner-id-123',
  
  // Chain ID for Gnosis Chain
  CHAIN_ID: '100',
  
  // JWT token validity (from docs: 1 hour)
  JWT_VALIDITY_HOURS: 1,
  
  // OTP validity (from docs: 5 minutes)
  OTP_VALIDITY_MINUTES: 5,

  // API Endpoints (exact paths from documentation)
  ENDPOINTS: {
    // Authentication
    NONCE: '/api/v1/auth/nonce',
    CHALLENGE: '/api/v1/auth/challenge',
    
    // User Registration
    OTP_REQUEST: '/api/v1/auth/signup/otp',
    SIGNUP: '/api/v1/auth/signup', // MUST include partnerId
    
    // User Profile
    USER: '/api/v1/user',
    
    // Terms of Service
    TERMS_GET: '/api/v1/user/terms',
    TERMS_POST: '/api/v1/user/terms',
    
    // KYC
    KYC_INTEGRATION: '/api/v1/kyc/integration',
    
    // Source of Funds
    SOF_GET: '/api/v1/source-of-funds',
    SOF_POST: '/api/v1/source-of-funds',
    
    // Phone Verification
    PHONE_REQUEST: '/api/v1/verification',
    PHONE_VERIFY: '/api/v1/verification/check',
    
    // Safe Account
    ACCOUNT_CREATE: '/api/v1/account',
    SAFE_SET_CURRENCY: '/api/v1/safe/set-currency',
    SIGNATURE_PAYLOAD: '/api/v1/account/signature-payload',
    DEPLOY_MODULES: '/api/v1/account/deploy-safe-modules',
    SAFE_CONFIG: '/api/v1/safe-config'
  },

  // Field name mappings (docs vs our implementation)
  FIELD_MAPPINGS: {
    // Correct field names from Gnosis Pay API
    KYC_STATUS: 'kycStatus', // NOT 'kycState'
    PHONE_VALIDATED: 'isPhoneValidated',
    SOF_ANSWERED: 'isSourceOfFundsAnswered',
    SAFE_WALLETS: 'safeWallets',
    ACCOUNT_STATUS: 'accountStatus'
  },

  // KYC Status values (from docs)
  KYC_STATUSES: {
    NOT_STARTED: 'notStarted',
    DOCUMENTS_REQUESTED: 'documentsRequested', 
    PENDING: 'pending',
    PROCESSING: 'processing',
    APPROVED: 'approved',
    RESUBMISSION_REQUESTED: 'resubmissionRequested',
    REJECTED: 'rejected',
    REQUIRES_ACTION: 'requiresAction'
  },

  // Terms of Service types (from docs)
  TOS_TYPES: {
    GENERAL: 'general-tos',
    CARD_MONAVATE: 'card-monavate-tos',
    CASHBACK: 'cashback-tos'
  },

  // Currency assignment - USDCe for all users
  CURRENCY_RULES: {
    DEFAULT: 'USDCe' // All users get USDCe
  },

  // Account status values for Safe modules
  ACCOUNT_STATUSES: {
    OK: 0, // Modules deployed successfully
    DELAY_QUEUE_NOT_EMPTY: 7 // Valid but has pending transactions
  }
} as const;

// Type definitions for type safety
export type GnosisKYCStatus = typeof GNOSIS_PAY_CONFIG.KYC_STATUSES[keyof typeof GNOSIS_PAY_CONFIG.KYC_STATUSES];
export type GnosisToSType = typeof GNOSIS_PAY_CONFIG.TOS_TYPES[keyof typeof GNOSIS_PAY_CONFIG.TOS_TYPES];

// Validation helpers
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!GNOSIS_PAY_CONFIG.PARTNER_ID || GNOSIS_PAY_CONFIG.PARTNER_ID === 'sample-partner-id-123') {
    errors.push('GNOSIS_PAY_PARTNER_ID environment variable must be set');
  }
  
  if (errors.length > 0) {
    console.error('🚨 Gnosis Pay Configuration Errors:', errors);
    return false;
  }
  
  return true;
};

// Full URL builders
export const buildGnosisURL = (endpoint: string, params?: Record<string, string>) => {
  let url = `${GNOSIS_PAY_CONFIG.API_BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

// Headers builder for Gnosis Pay API calls
export const buildGnosisHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
};

export default GNOSIS_PAY_CONFIG;