import { test, expect } from '@playwright/test';

/**
 * Gnosis Pay Onboarding Flow Compliance Tests
 * Based on: https://docs.gnosispay.com/onboarding-flow
 */

test.describe('Gnosis Pay Onboarding Flow - Compliance', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should enforce sequential flow progression', async ({ page }) => {
    // User cannot access KYC without completing ToS
    await page.goto('/kyc');
    await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
    
    // User cannot access Safe Setup without completing previous steps
    await page.goto('/safe-setup');
    await expect(page.locator('[data-testid="prerequisites-missing"]')).toBeVisible();
  });

  test('should include partnerId in OTP verification', async ({ page }) => {
    // Mock the API call to verify partnerId is included
    await page.route('**/api/v1/auth/signup', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // CRITICAL: partnerId must be present
      expect(postData).toHaveProperty('partnerId');
      expect(postData.partnerId).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Simulate OTP verification flow
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="request-otp"]');
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp"]');
  });

  test('should block ToS bypass attempts', async ({ page }) => {
    // Attempt to navigate directly to KYC without ToS
    await page.evaluate(() => {
      window.history.pushState({}, '', '/kyc');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    
    // Should redirect back to ToS
    await expect(page.locator('[data-testid="terms-page"]')).toBeVisible();
  });

  test('should prevent Safe creation without prerequisites', async ({ page }) => {
    // Mock incomplete user state
    await page.evaluate(() => {
      localStorage.setItem('mockUser', JSON.stringify({
        kycStatus: 'pending', // Not approved
        isPhoneValidated: false,
        isSourceOfFundsAnswered: false
      }));
    });

    await page.goto('/safe-setup');
    
    // Should show error or redirect
    await expect(page.locator('[data-testid="prerequisites-error"]')).toBeVisible();
  });

  test('should handle KYC status transitions correctly', async ({ page }) => {
    const kycStatuses = ['notStarted', 'documentsRequested', 'pending', 'processing', 'approved'];
    
    for (const status of kycStatuses) {
      await page.route('**/api/v1/user', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ kycStatus: status })
        });
      });

      await page.reload();
      
      if (status === 'approved') {
        await expect(page.locator('[data-testid="kyc-completed"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="kyc-pending"]')).toBeVisible();
      }
    }
  });

  test('should validate Source of Funds questionnaire', async ({ page }) => {
    // Mock questions API
    await page.route('**/api/v1/source-of-funds', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              question: "What is the primary source of your funds?",
              answers: ["Employment", "Investment", "Business", "Other"]
            }
          ])
        });
      }
    });

    await page.goto('/source-of-funds');
    
    // Should not allow submission without answers
    await page.click('[data-testid="submit-answers"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Should allow submission with complete answers
    await page.click('[data-testid="answer-employment"]');
    await page.click('[data-testid="submit-answers"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should handle expired JWT tokens', async ({ page }) => {
    // Mock expired token
    await page.route('**/api/v1/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' })
      });
    });

    await page.goto('/dashboard');
    
    // Should redirect to auth
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
  });
});

// Contract tests for API request/response format compliance
test.describe('API Contract Compliance', () => {
  
  test('should match Gnosis Pay API response schemas', async ({ page }) => {
    await page.route('**/api/v1/user', async (route) => {
      const response = {
        id: 'user_123',
        email: 'test@example.com',
        kycStatus: 'approved', // Must be kycStatus, not kycState
        isPhoneValidated: true,
        isSourceOfFundsAnswered: true,
        safeWallets: []
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Verify our app handles the correct field names
    await page.goto('/dashboard');
    const userState = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('userState') || '{}');
    });
    
    // These should match the Gnosis Pay API spec
    expect(userState).toHaveProperty('kycStatus');
    expect(userState).toHaveProperty('isPhoneValidated');
    expect(userState).toHaveProperty('isSourceOfFundsAnswered');
  });
});

/**
 * Run commands:
 * npm install -D @playwright/test
 * npx playwright install
 * npx playwright test tests/e2e/gnosis-onboarding.spec.ts
 */