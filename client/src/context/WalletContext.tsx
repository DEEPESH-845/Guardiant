'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAccount } from 'wagmi';

type WalletContextType = ReturnType<typeof useAccount>;

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const accountData = useAccount();

  return (
    <WalletContext.Provider value={accountData}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}
