import { apiFetch } from '@/lib/api';
import { 
  UserResponse, 
  TermsResponse, 
  KycStatusResponse, 
  AccountResponse, 
  AccountStatusResponse, 
  DeployModulesResponse,
  SafeConfigResponse,
  CardDetailsResponse 
} from '@/types/gnosis-api';

/**
 * Gnosis Pay API Service
 * Implements the official onboarding flow API calls
 */
export class GnosisApiService {
  
  // Remove the verifyToken method since it's not a real Gnosis Pay endpoint

  // 1. User Registration: Check if user is registered
  static async getUser(): Promise<UserResponse> {
    return await apiFetch<UserResponse>('/user');
  }

  // 2. Terms of Service: Get ToS acceptance status
  static async getTerms(): Promise<TermsResponse> {
    return await apiFetch<TermsResponse>('/user/terms');
  }

  // 2. Terms of Service: Accept ToS
  static async acceptTerms(terms: string, version: string): Promise<void> {
    await apiFetch('/user/terms', {
      method: 'POST',
      body: JSON.stringify({ terms, version })
    });
  }

  // 3. KYC: Start KYC process
  static async startKyc(): Promise<void> {
    await apiFetch('/kyc/start', {
      method: 'POST'
    });
  }

  // 3. KYC: Get KYC status
  static async getKycStatus(): Promise<KycStatusResponse> {
    return await apiFetch<KycStatusResponse>('/kyc/status');
  }

  // 4. Source of Funds: Submit source of funds
  static async submitSourceOfFunds(source: string): Promise<void> {
    await apiFetch('/user/source-of-funds', {
      method: 'POST',
      body: JSON.stringify({ source })
    });
  }

  // 5. Safe Account: Get Safe account info
  static async getAccount(): Promise<AccountResponse> {
    return await apiFetch<AccountResponse>('/account');
  }

  // 5. Safe Account: Get Safe account status
  static async getAccountStatus(): Promise<AccountStatusResponse> {
    return await apiFetch<AccountStatusResponse>('/safe-config');
  }

  // Additional method for safe configuration (alias for consistency)
  static async getSafeConfig(): Promise<SafeConfigResponse> {
    return await apiFetch<SafeConfigResponse>('/safe-config');
  }

  // 6. Safe Module Deployment: Deploy Safe modules
  static async deploySafeModules(signature: string): Promise<DeployModulesResponse> {
    return await apiFetch<DeployModulesResponse>('/account/deploy-safe-modules', {
      method: 'PATCH',
      body: JSON.stringify({ signature })
    });
  }

  // Card Management API Methods
  
  // Get card details (including balance and sensitive data)
  static async getCardDetails(cardId: string): Promise<CardDetailsResponse> {
    return await apiFetch<CardDetailsResponse>(`/cards/${cardId}`);
  }

  // Get all user cards (basic info)
  static async getUserCards(): Promise<Array<{
    id: string;
    cardToken: string;
    lastFourDigits: string;
    activatedAt?: string;
    virtual: boolean;
    statusCode: number;
    statusName: string;
  }>> {
    return await apiFetch('/cards');
  }

  // Get enhanced card data with status
  static async getCardWithStatus(cardId: string): Promise<{
    card: {
      id: string;
      cardToken: string;
      lastFourDigits: string;
      activatedAt?: string;
      virtual: boolean;
      statusCode: number;
      statusName: string;
    };
    status: {
      activatedAt?: string;
      statusCode: number;
      isFrozen: boolean;
      isStolen: boolean;
      isLost: boolean;
      isBlocked: boolean;
      isVoid: boolean;
    };
  }> {
    const [cardDetails] = await Promise.all([
      apiFetch(`/cards`).then((cards: any[]) => cards.find(c => c.id === cardId)),
    ]);
    
    const status = await this.getCardStatus(cardId);
    
    return {
      card: cardDetails,
      status
    };
  }

  // Activate a card
  static async activateCard(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/activate`, {
      method: 'POST'
    });
  }

  // Freeze a card
  static async freezeCard(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/freeze`, {
      method: 'POST'
    });
  }

  // Unfreeze a card
  static async unfreezeCard(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/unfreeze`, {
      method: 'POST'
    });
  }

  // Void a virtual card
  static async voidCard(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/void`, {
      method: 'POST'
    });
  }

  // Report card as lost
  static async reportCardLost(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/lost`, {
      method: 'POST'
    });
  }

  // Report card as stolen
  static async reportCardStolen(cardId: string): Promise<{ status: string }> {
    return await apiFetch<{ status: string }>(`/cards/${cardId}/stolen`, {
      method: 'POST'
    });
  }

  // Create a virtual card
  static async createVirtualCard(): Promise<{ cardId: string }> {
    console.log('🚀 Creating virtual card via Gnosis API');
    try {
      const result = await apiFetch<{ cardId: string }>(`/cards/virtual`, {
        method: 'POST'
      });
      console.log('🚀 Virtual card created successfully:', result);
      return result;
    } catch (error) {
      console.error('🚀 Failed to create virtual card:', error);
      throw new Error(`Failed to create virtual card: ${error.message}`);
    }
  }

  // Get card status
  static async getCardStatus(cardId: string): Promise<{
    activatedAt?: string;
    statusCode: number;
    isFrozen: boolean;
    isStolen: boolean;
    isLost: boolean;
    isBlocked: boolean;
    isVoid: boolean;
  }> {
    return await apiFetch(`/cards/${cardId}/status`);
  }

  // Get paginated transactions for all activated cards
  static async getCardTransactions(page: number = 1, limit: number = 10): Promise<{
    count: number;
    next?: string;
    previous?: string;
    results: Array<{
      id: string;
      createdAt: string;
      clearedAt?: string;
      country: {
        name: string;
        numeric: string;
        alpha2: string;
        alpha3: string;
      };
      isPending: boolean;
      mcc: string;
      merchant: {
        name: string;
        city: string;
        country: {
          name: string;
          numeric: string;
          alpha2: string;
          alpha3: string;
        };
      };
      billingAmount: string;
      billingCurrency: {
        symbol: string;
        code: string;
        decimals: number;
        name: string;
      };
      transactionAmount: string;
      transactionCurrency: {
        symbol: string;
        code: string;
        decimals: number;
        name: string;
      };
      transactionType: string;
      cardToken: string;
      transactions: Array<{
        status: string;
        to: string;
        value: string;
        data: string;
        hash: string;
      }>;
      kind: string;
      status: string;
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return await apiFetch(`/cards/transactions?${params.toString()}`);
  }
}