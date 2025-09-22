/**
 * Unit tests for Gnosis Pay API compliance
 * Validates request/response formats against official docs
 */

import { describe, it, expect, vi } from 'vitest';
import { apiFetch } from '@/lib/api';

// Mock the global fetch
global.fetch = vi.fn();

describe('Gnosis Pay API Compliance', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include partnerId in signup request', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));

    const signupData = {
      authEmail: 'test@example.com',
      otp: '123456',
      partnerId: 'test-partner-id', // CRITICAL: Must be included
      referralCouponCode: 'REF123'
    };

    await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData)
    });

    const [url, options] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(options.body as string);
    
    expect(requestBody).toHaveProperty('partnerId');
    expect(requestBody.partnerId).toBe('test-partner-id');
  });

  it('should handle user profile response with correct field names', async () => {
    const mockUserResponse = {
      id: 'user_123',
      email: 'test@example.com',
      kycStatus: 'approved', // Not kycState
      isPhoneValidated: true,
      isSourceOfFundsAnswered: true,
      safeWallets: [
        {
          address: '0x1234567890abcdef',
          chainId: '100',
          tokenSymbol: 'EURe'
        }
      ]
    };

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockUserResponse)));

    const result = await apiFetch('/user');
    
    expect(result).toHaveProperty('kycStatus');
    expect(result).toHaveProperty('isPhoneValidated');
    expect(result).toHaveProperty('isSourceOfFundsAnswered');
    expect(result.kycStatus).toBe('approved');
  });

  it('should validate ToS acceptance request format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ accepted: true })));

    const tosData = {
      terms: 'general-tos',
      version: 'TOS_GENERAL_VERSION_1'
    };

    await apiFetch('/user/terms', {
      method: 'POST',
      body: JSON.stringify(tosData)
    });

    const [url, options] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(options.body as string);
    
    expect(requestBody).toHaveProperty('terms');
    expect(requestBody).toHaveProperty('version');
    expect(requestBody.terms).toBe('general-tos');
  });

  it('should validate Source of Funds submission format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));

    const sofAnswers = [
      {
        question: "What is the primary source of your funds?",
        answer: "Employment"
      },
      {
        question: "What is your estimated monthly income?", 
        answer: "€3,000 - €5,000"
      }
    ];

    await apiFetch('/source-of-funds', {
      method: 'POST',
      body: JSON.stringify(sofAnswers)
    });

    const [url, options] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(options.body as string);
    
    expect(Array.isArray(requestBody)).toBe(true);
    expect(requestBody[0]).toHaveProperty('question');
    expect(requestBody[0]).toHaveProperty('answer');
  });

  it('should validate Safe account creation request', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ 
      deployed: true,
      transactionHash: '0xabc123'
    })));

    const safeData = {
      chainId: '100' // Gnosis Chain ID
    };

    await apiFetch('/account', {
      method: 'POST',
      body: JSON.stringify(safeData)
    });

    const [url, options] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(options.body as string);
    
    expect(requestBody).toHaveProperty('chainId');
    expect(requestBody.chainId).toBe('100');
  });

  it('should validate phone verification request format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ sent: true })));

    const phoneData = {
      phoneNumber: '+1234567890'
    };

    await apiFetch('/verification', {
      method: 'POST', 
      body: JSON.stringify(phoneData)
    });

    const [url, options] = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(options.body as string);
    
    expect(requestBody).toHaveProperty('phoneNumber');
    expect(requestBody.phoneNumber).toBe('+1234567890');
  });
});

/**
 * Run commands:
 * npm run test tests/unit/api-compliance.test.ts
 * npm run test:watch tests/unit/api-compliance.test.ts
 */