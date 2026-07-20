/// <reference types="vite/client" />

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
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
  // Auth
  signIn: () => Promise<{ success: boolean }>;
  signOut: () => Promise<{ success: boolean }>;
  getToken: () => Promise<string | null>;
  getAuthState: () => Promise<AuthState>;
  onAuthStateChanged: (callback: (state: AuthState) => void) => void;

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

  // Deep link (OAuth callback)
  onDeepLink: (callback: (url: string) => void) => void;

  // Platform
  platform: NodeJS.Platform;
}

interface Window {
  electronAPI: ElectronAPI;
}
