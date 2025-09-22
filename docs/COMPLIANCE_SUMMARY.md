# 🚨 Gnosis Pay Onboarding Flow Compliance Audit

**Audit Date:** January 21, 2025  
**Documentation Source:** [https://docs.gnosispay.com/onboarding-flow](https://docs.gnosispay.com/onboarding-flow)  
**Status:** ❌ NON-COMPLIANT (7 Critical Issues Found)

---

## 📊 **Executive Summary**

Our current Gnosis Pay integration has **7 critical compliance issues** that prevent proper onboarding flow functionality. The implementation deviates significantly from the official Gnosis Pay API specification in several key areas.

### **Critical Issues Breakdown:**
- 🔴 **API Integration:** Using proxy instead of direct API calls
- 🔴 **Missing Fields:** partnerId not included in signup requests
- 🔴 **Field Names:** Incorrect field naming (kycState vs kycStatus)
- 🔴 **Flow Control:** Potential ToS bypass
- 🔴 **Configuration:** Hardcoded URLs and missing environment variables

---

## 🔍 **Detailed Findings**

### **1. Missing partnerId in User Registration** ⚠️ CRITICAL
```diff
// Required by Gnosis Pay API
POST /api/v1/auth/signup
{
  "authEmail": "string",
  "otp": "string",
+ "partnerId": "string",  // MISSING in our implementation
  "referralCouponCode": "string" (optional)
}
```
**Impact:** User registration will fail  
**Fix:** Add partnerId to all signup requests

### **2. Incorrect API Base URL** ⚠️ CRITICAL  
```diff
- Current: https://rygosxqfureajtqjgquj.supabase.co/functions/v1/gnosis-auth
+ Required: https://api.gnosispay.com
```
**Impact:** All API calls are proxied instead of direct  
**Fix:** Update to use official Gnosis Pay API directly

### **3. Field Name Inconsistencies** ⚠️ HIGH
```diff
// Official API uses:
- kycStatus (not kycState)
- isPhoneValidated
- isSourceOfFundsAnswered
- safeWallets

// Our code uses:
- kycState ❌
- phoneVerified ❌
- sourceOfFundsAnswered ❌
```

### **4. Terms of Service Bypass Risk** ⚠️ HIGH
Current implementation allows potential navigation bypass of ToS acceptance step.

### **5. Incomplete Source of Funds Integration** ⚠️ MEDIUM
Component exists but not properly integrated into the flow validation.

### **6. Safe Setup API Sequence** ⚠️ MEDIUM  
Missing proper 4-step Safe setup sequence:
1. Create Safe → 2. Set Currency → 3. Get Signature → 4. Deploy Modules

### **7. JWT Token Handling** ⚠️ LOW
Token refresh and expiration handling needs improvement.

---

## ✅ **Compliance Action Plan**

### **Immediate (P0) - Block Release**
1. **Add partnerId to signup** - Update edge function and frontend
2. **Fix field name mappings** - Align with official API schema  
3. **Update API base URLs** - Switch to direct Gnosis Pay API calls

### **Next Sprint (P1)**
4. **Implement ToS enforcement** - Prevent step bypass
5. **Complete Safe setup flow** - 4-step API sequence
6. **Add flow validation middleware** - Enforce prerequisites

### **Following Sprint (P2)**  
7. **JWT token refresh** - Handle expiration gracefully
8. **Comprehensive error handling** - User-friendly error messages
9. **E2E test coverage** - Automated compliance testing

---

## 🧪 **Test Coverage Requirements**

### **E2E Tests (Required)**
```bash
# Run full onboarding flow tests
npx playwright test tests/e2e/gnosis-onboarding.spec.ts

# Test coverage areas:
✓ Sequential flow enforcement
✓ partnerId inclusion validation  
✓ ToS bypass prevention
✓ KYC status transitions
✓ Safe creation prerequisites
✓ Phone verification flow
```

### **Unit Tests (Required)**
```bash
# API contract compliance tests
npm run test tests/unit/api-compliance.test.ts

# Coverage areas:
✓ Request/response schema validation
✓ Field name consistency
✓ Required field validation
✓ Error handling scenarios
```

---

## 🔧 **Configuration Changes**

### **Environment Variables (Required)**
```env
# Add to .env
GNOSIS_PAY_PARTNER_ID=your-actual-partner-id
GNOSIS_PAY_API_BASE_URL=https://api.gnosispay.com
```

### **API Client Updates (Required)**
- Replace Supabase edge function proxy with direct API calls
- Implement proper error handling for Gnosis Pay API responses
- Add request/response logging for debugging

---

## 📈 **Success Metrics**

### **Before Fix:**
- ❌ 0% API compliance
- ❌ User registration fails
- ❌ No flow enforcement
- ❌ Incorrect data mapping

### **After Fix:**
- ✅ 100% API compliance  
- ✅ Successful user onboarding
- ✅ Enforced sequential flow
- ✅ Correct field mappings

---

## 📋 **Checklist for Release**

- [ ] partnerId included in all signup requests
- [ ] Direct Gnosis Pay API integration
- [ ] Field names match official documentation  
- [ ] ToS bypass prevention implemented
- [ ] Complete Safe setup 4-step flow
- [ ] Source of Funds properly integrated
- [ ] E2E tests passing
- [ ] Unit tests covering API contracts
- [ ] Error handling for all API endpoints
- [ ] JWT token refresh implemented

---

**Next Steps:** Prioritize P0 items for immediate fix before next release. Schedule P1 items for next sprint planning.

**Review Required:** Technical lead and product owner sign-off needed before implementation begins.