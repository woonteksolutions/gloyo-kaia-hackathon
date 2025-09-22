import { useGnosisPay } from '@/contexts/GnosisPayContext';
import { PreAuthDashboard } from '@/components/dashboard/PreAuthDashboard';
import { PostAuthDashboard } from '@/components/dashboard/PostAuthDashboard';
import { JWTStatus } from '@/components/JWTStatus';

export default function Dashboard() {
  const { isAuthenticated, accessToken, isTokenExpired } = useGnosisPay();

  // Show different dashboard based on authentication state
  if (isAuthenticated || (accessToken && !isTokenExpired)) {
    // User has completed Gnosis onboarding - show full dashboard
    return (
      <>
        <PostAuthDashboard />
        {/* Show JWT status in development or when token exists */}
        {(process.env.NODE_ENV === 'development' || accessToken) && (
          <div className="fixed bottom-20 right-4 z-40 max-w-xs">
            <JWTStatus compact />
          </div>
        )}
      </>
    );
  } else {
    // User has wallet connected but hasn't started/completed Gnosis onboarding - show access screen
    return (
      <>
        <PreAuthDashboard />
        {/* Show JWT status in development or when token exists */}
        {(process.env.NODE_ENV === 'development' || accessToken) && (
          <div className="fixed bottom-20 right-4 z-40 max-w-xs">
            <JWTStatus compact />
          </div>
        )}
      </>
    );
  }
}