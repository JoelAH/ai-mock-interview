import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface IAPContextValue {
  offerings: IAPOffering[];
  subscription: IAPSubscriptionInfo | null;
  isLoading: boolean;
  isPurchasing: boolean;
  canMakePayments: boolean;
  purchase: (productId: string) => Promise<boolean>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const IAPContext = createContext<IAPContextValue>({
  offerings: [],
  subscription: null,
  isLoading: true,
  isPurchasing: false,
  canMakePayments: false,
  purchase: async () => false,
  restore: async () => {},
  refresh: async () => {},
});

export function IAPProvider({ children }: { children: React.ReactNode }) {
  const [offerings, setOfferings] = useState<IAPOffering[]>([]);
  const [subscription, setSubscription] = useState<IAPSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [canMakePayments, setCanMakePayments] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [canPay, subs, offers] = await Promise.all([
        window.electronAPI.iapCanMakePayments(),
        window.electronAPI.iapGetSubscription(),
        window.electronAPI.iapGetOfferings().catch(() => [] as IAPOffering[]),
      ]);
      setCanMakePayments(canPay);
      setSubscription(subs);
      setOfferings(offers);
    } catch (err) {
      console.error('[IAP] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for purchase completion to refresh state
    window.electronAPI.onIapPurchaseComplete(() => {
      setIsPurchasing(false);
      loadData();
    });

    window.electronAPI.onIapRestoreComplete(() => {
      loadData();
    });
  }, [loadData]);

  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    setIsPurchasing(true);
    try {
      const result = await window.electronAPI.iapPurchase(productId);
      return result;
    } catch {
      return false;
    } finally {
      setIsPurchasing(false);
      await loadData();
    }
  }, [loadData]);

  const restore = useCallback(async () => {
    try {
      await window.electronAPI.iapRestore();
    } finally {
      await loadData();
    }
  }, [loadData]);

  return (
    <IAPContext.Provider
      value={{
        offerings,
        subscription,
        isLoading,
        isPurchasing,
        canMakePayments,
        purchase,
        restore,
        refresh: loadData,
      }}
    >
      {children}
    </IAPContext.Provider>
  );
}

export function useIAP(): IAPContextValue {
  return useContext(IAPContext);
}
