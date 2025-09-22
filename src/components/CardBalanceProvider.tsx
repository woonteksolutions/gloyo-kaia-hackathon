import React, { createContext, useContext } from 'react';
import { useGnosisTokenBalance } from '@/hooks/useGnosisTokenBalance';

interface CardBalanceContextType {
  balance: number;
  isLoading: boolean;
  error?: string;
}

const CardBalanceContext = createContext<CardBalanceContextType | undefined>(undefined);

interface CardBalanceProviderProps {
  children: React.ReactNode;
}

export function CardBalanceProvider({ children }: CardBalanceProviderProps) {
  const { balance, isLoading, error } = useGnosisTokenBalance();

  return (
    <CardBalanceContext.Provider value={{ balance, isLoading, error }}>
      {children}
    </CardBalanceContext.Provider>
  );
}

export function useCardBalance() {
  const context = useContext(CardBalanceContext);
  if (context === undefined) {
    throw new Error('useCardBalance must be used within a CardBalanceProvider');
  }
  return context;
}