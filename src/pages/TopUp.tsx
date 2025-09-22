import TopUpApp from '@/components/topup/TopUpApp';
import { useNavigate } from 'react-router-dom';
import { useTopUpDefaults } from '@/hooks/useTopUpDefaults';
import { AppHeader } from '@/components/layout/AppHeader';
import { useRef } from 'react';

export default function TopUpPage() {
  const navigate = useNavigate();
  const topUpDefaults = useTopUpDefaults();
  const topUpAppRef = useRef<{ handleBack: () => void }>(null);

  const handleHeaderBack = () => {
    if (topUpAppRef.current?.handleBack) {
      topUpAppRef.current.handleBack();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Add Funds"
        showBackButton
        onBack={handleHeaderBack}
      />

      <main className="mobile-container mobile-content">
        <TopUpApp 
          ref={topUpAppRef}
          defaultRecipient={topUpDefaults.defaultRecipient}
          defaultTokenTo={topUpDefaults.defaultTokenTo}
          defaultChainTo={topUpDefaults.defaultChainTo}
          skipDestinationSelection={topUpDefaults.skipDestinationSelection}
          onClose={() => navigate('/')}
        />
      </main>
    </div>
  );
}
