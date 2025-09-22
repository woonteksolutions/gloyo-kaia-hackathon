import { CreditCard, TrendingUp } from 'lucide-react';

interface BottomNavigationProps {
  currentTab?: 'card' | 'earn';
  onCardClick?: () => void;
  onEarnClick?: () => void;
}

export function BottomNavigation({ 
  currentTab = 'card', 
  onCardClick, 
  onEarnClick 
}: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="flex">
        <button
          onClick={onCardClick}
          className={`flex-1 flex flex-col items-center justify-center py-4 transition-colors ${
            currentTab === 'card' 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-5 h-5 mb-1" />
          <span className={`text-xs ${currentTab === 'card' ? 'font-medium' : ''}`}>
            Card
          </span>
        </button>
        <button
          onClick={onEarnClick}
          className={`flex-1 flex flex-col items-center justify-center py-4 transition-colors ${
            currentTab === 'earn' 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-1" />
          <span className={`text-xs ${currentTab === 'earn' ? 'font-medium' : ''}`}>
            Earn
          </span>
        </button>
      </div>
    </div>
  );
}