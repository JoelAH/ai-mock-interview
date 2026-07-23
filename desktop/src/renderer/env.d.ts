/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface IAPProduct {
  productIdentifier: string;
  localizedTitle: string;
  localizedDescription: string;
  formattedPrice: string;
  price: number;
  currencyCode: string;
}

interface IAPOffering {
  tier: 'starter' | 'pro' | 'premium';
  product: IAPProduct;
}

interface IAPSubscriptionInfo {
  isActive: boolean;
  tier: 'free' | 'starter' | 'pro' | 'premium';
  expiresAt: string | null;
  willRenew: boolean;
}

interface ElectronAPI {
  // In-App Purchase
  iapCanMakePayments: () => Promise<boolean>;
  iapGetOfferings: () => Promise<IAPOffering[]>;
  iapPurchase: (productId: string) => Promise<boolean>;
  iapRestore: () => Promise<void>;
  iapGetSubscription: () => Promise<IAPSubscriptionInfo>;
  onIapPurchaseComplete: (callback: (data: { productId: string; success: boolean }) => void) => void;
  onIapRestoreComplete: (callback: () => void) => void;

  // Navigation (from native menu shortcuts)
  onNavigate: (callback: (route: string) => void) => void;

  // Deep link
  onDeepLink: (callback: (url: string) => void) => void;

  // Platform
  platform: NodeJS.Platform;
}

interface Window {
  electronAPI: ElectronAPI;
}
