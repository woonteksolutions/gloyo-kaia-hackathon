// Single source of truth for the auth token with expiration tracking
export type AuthState = {
  accessToken: string | null;
  tokenExpiry: number | null; // Unix timestamp when token expires
  userData: any | null; // Store user data with token
};

let state: AuthState = { 
  accessToken: null,
  tokenExpiry: null,
  userData: null
};

// Write with 1-hour expiration
export function setAccessToken(accessToken: string | null, userData?: any) {
  state.accessToken = accessToken ?? null;
  state.userData = userData ?? null;
  
  if (accessToken) {
    // Set expiry to 1 hour from now (as per Gnosis Pay JWT validity)
    const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour in milliseconds
    state.tokenExpiry = expiryTime;
    
    // Persistence to localStorage
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("tokenExpiry", expiryTime.toString());
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    }
    
    console.log('🔑 JWT token stored with 1-hour expiration:', new Date(expiryTime).toISOString());
  } else {
    state.tokenExpiry = null;
    state.userData = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("userData");
  }
}

// Read (synchronous) with expiry check
export function getAccessToken(): string | null {
  // Hydration from localStorage if not in memory
  if (state.accessToken === null) {
    const stored = localStorage.getItem("accessToken");
    const storedExpiry = localStorage.getItem("tokenExpiry");
    const storedUserData = localStorage.getItem("userData");
    
    if (stored && stored.length && storedExpiry) {
      state.accessToken = stored;
      state.tokenExpiry = parseInt(storedExpiry);
      try {
        state.userData = storedUserData ? JSON.parse(storedUserData) : null;
      } catch (e) {
        state.userData = null;
      }
    }
  }
  
  // Check if token is expired
  if (state.accessToken && state.tokenExpiry) {
    if (Date.now() >= state.tokenExpiry) {
      console.log('🔑 JWT token expired, clearing token');
      clearAccessToken();
      return null;
    }
  }
  
  return state.accessToken;
}

// Get stored user data
export function getStoredUserData(): any | null {
  // Ensure token is loaded first (which loads user data too)
  getAccessToken();
  return state.userData;
}

// Check if token is expired without returning it
export function isTokenExpired(): boolean {
  if (!state.accessToken || !state.tokenExpiry) {
    return true;
  }
  return Date.now() >= state.tokenExpiry;
}

// Get remaining token time in minutes
export function getTokenRemainingTime(): number {
  if (!state.tokenExpiry) return 0;
  const remaining = state.tokenExpiry - Date.now();
  return Math.max(0, Math.floor(remaining / (60 * 1000))); // in minutes
}

// Clear
export function clearAccessToken() {
  state.accessToken = null;
  state.tokenExpiry = null;
  state.userData = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("userData");
}