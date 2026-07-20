import { inAppPurchase, BrowserWindow } from 'electron';

/**
 * In-App Purchase manager for the Mac App Store.
 *
 * Uses Electron's native `inAppPurchase` module (StoreKit bridge) for
 * transaction handling, and RevenueCat's REST API for receipt validation
 * and entitlement management.
 *
 * Flow:
 * 1. App identifies user with RevenueCat (Clerk user ID as app_user_id)
 * 2. Fetches offerings/products from RevenueCat REST API
 * 3. Purchases via Electron's inAppPurchase (Apple payment sheet)
 * 4. Sends receipt to RevenueCat for validation
 * 5. RevenueCat webhook fires → backend updates user tier in MongoDB
 */

// RevenueCat API configuration
// In production, store these in a config file or env
const REVENUECAT_API_KEY = ''; // Set in production: RevenueCat public API key for Apple platform
const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';

// Product IDs (registered in App Store Connect)
export const PRODUCT_IDS = {
  starter: 'com.devmockview.starter.monthly',
  pro: 'com.devmockview.pro.monthly',
  premium: 'com.devmockview.premium.monthly',
} as const;

export type TierProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export interface IAPProduct {
  productIdentifier: string;
  localizedTitle: string;
  localizedDescription: string;
  formattedPrice: string;
  price: number;
  currencyCode: string;
}

export interface IAPOffering {
  tier: 'starter' | 'pro' | 'premium';
  product: IAPProduct;
}

export interface SubscriptionInfo {
  isActive: boolean;
  tier: 'free' | 'starter' | 'pro' | 'premium';
  expiresAt: string | null;
  willRenew: boolean;
}

let mainWindow: BrowserWindow | null = null;
let currentUserId: string | null = null;

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

/**
 * Check if the Mac App Store IAP system is available.
 */
export function canMakePayments(): boolean {
  return inAppPurchase.canMakePayments();
}

/**
 * Identify the user with RevenueCat. Must be called after authentication.
 */
export async function identifyUser(clerkUserId: string): Promise<void> {
  currentUserId = clerkUserId;

  if (!REVENUECAT_API_KEY) {
    console.warn('[IAP] RevenueCat API key not configured — IAP disabled');
    return;
  }

  try {
    // Create or get subscriber in RevenueCat
    await fetch(`${REVENUECAT_BASE_URL}/subscribers/${clerkUserId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'macos',
      },
    });
  } catch (err) {
    console.error('[IAP] Failed to identify user with RevenueCat:', err);
  }
}

/**
 * Fetch available products from the Mac App Store via Electron's IAP module.
 */
export async function getOfferings(): Promise<IAPOffering[]> {
  const productIds = Object.values(PRODUCT_IDS);

  // Electron's inAppPurchase.getProducts returns StoreKit product info
  const products = await inAppPurchase.getProducts(productIds);

  const tierMap: Record<string, 'starter' | 'pro' | 'premium'> = {
    [PRODUCT_IDS.starter]: 'starter',
    [PRODUCT_IDS.pro]: 'pro',
    [PRODUCT_IDS.premium]: 'premium',
  };

  return products.map((product) => ({
    tier: tierMap[product.productIdentifier] || 'starter',
    product: {
      productIdentifier: product.productIdentifier,
      localizedTitle: product.localizedTitle,
      localizedDescription: product.localizedDescription,
      formattedPrice: product.formattedPrice,
      price: product.price,
      currencyCode: product.currencyCode,
    },
  }));
}

/**
 * Initiate a purchase for a given product.
 * This shows the Apple payment sheet.
 */
export async function purchaseProduct(productId: string): Promise<boolean> {
  if (!canMakePayments()) {
    throw new IAPError('Purchases are not available on this device');
  }

  return new Promise((resolve, reject) => {
    // Listen for transaction updates
    const handler = (
      _event: unknown,
      transactions: Electron.Transaction[]
    ) => {
      for (const transaction of transactions) {
        if (transaction.payment.productIdentifier !== productId) continue;

        switch (transaction.transactionState) {
          case 'purchased':
            // Validate receipt with RevenueCat
            validateReceipt()
              .then(() => {
                notifyRenderer('iap-purchase-complete', { productId, success: true });
                resolve(true);
              })
              .catch((err) => {
                console.error('[IAP] Receipt validation failed:', err);
                resolve(true); // Still consider it successful — webhook will sync
              });
            break;

          case 'failed':
            notifyRenderer('iap-purchase-complete', { productId, success: false });
            reject(new IAPError('Purchase failed or was cancelled'));
            break;

          case 'restored':
            resolve(true);
            break;

          case 'deferred':
            // Parental approval needed — notify UI
            notifyRenderer('iap-purchase-deferred', { productId });
            resolve(false);
            break;
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inAppPurchase.on('transactions-updated' as any, handler as any);

    // Initiate the purchase
    inAppPurchase.purchaseProduct(productId).then((isProductValid) => {
      if (!isProductValid) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inAppPurchase.removeListener('transactions-updated' as any, handler as any);
        reject(new IAPError(`Product "${productId}" is not valid`));
      }
    });

    // Timeout after 5 minutes (user might take time with payment sheet)
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inAppPurchase.removeListener('transactions-updated' as any, handler as any);
    }, 5 * 60 * 1000);
  });
}

/**
 * Restore previous purchases (Apple requirement).
 */
export async function restorePurchases(): Promise<void> {
  inAppPurchase.restoreCompletedTransactions();

  // After restore, validate the receipt with RevenueCat
  await validateReceipt();
  notifyRenderer('iap-restore-complete', {});
}

/**
 * Get current subscription status from RevenueCat.
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  if (!REVENUECAT_API_KEY || !currentUserId) {
    return { isActive: false, tier: 'free', expiresAt: null, willRenew: false };
  }

  try {
    const response = await fetch(
      `${REVENUECAT_BASE_URL}/subscribers/${currentUserId}`,
      {
        headers: {
          Authorization: `Bearer ${REVENUECAT_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Platform': 'macos',
        },
      }
    );

    if (!response.ok) {
      return { isActive: false, tier: 'free', expiresAt: null, willRenew: false };
    }

    const data = (await response.json()) as {
      subscriber?: {
        entitlements?: Record<
          string,
          { expires_date?: string; unsubscribe_detected_at?: string | null }
        >;
      };
    };

    const entitlements = data.subscriber?.entitlements || {};

    // Check entitlements in order of priority (highest first)
    for (const tier of ['premium', 'pro', 'starter'] as const) {
      const entitlement = entitlements[`${tier}_access`];
      if (entitlement) {
        const expiresAt = entitlement.expires_date || null;
        const isActive = expiresAt ? new Date(expiresAt) > new Date() : true;
        if (isActive) {
          return {
            isActive: true,
            tier,
            expiresAt,
            willRenew: !entitlement.unsubscribe_detected_at,
          };
        }
      }
    }

    return { isActive: false, tier: 'free', expiresAt: null, willRenew: false };
  } catch (err) {
    console.error('[IAP] Failed to get subscription info:', err);
    return { isActive: false, tier: 'free', expiresAt: null, willRenew: false };
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Send the local App Store receipt to RevenueCat for validation.
 * RevenueCat validates with Apple, syncs entitlements, and fires webhooks.
 */
async function validateReceipt(): Promise<void> {
  if (!REVENUECAT_API_KEY || !currentUserId) return;

  try {
    // Electron provides the receipt data through the app receipt URL
    // In a MAS build, the receipt is at: <app_bundle>/Contents/_MASReceipt/receipt
    // RevenueCat handles the receipt fetch when we POST to their receipts endpoint
    const response = await fetch(`${REVENUECAT_BASE_URL}/receipts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'macos',
      },
      body: JSON.stringify({
        app_user_id: currentUserId,
        fetch_token: 'true', // Let RevenueCat fetch the receipt from StoreKit
        product_id: '', // RevenueCat determines this from the receipt
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[IAP] Receipt validation response:', response.status, body);
    }
  } catch (err) {
    console.error('[IAP] Receipt validation error:', err);
  }
}

function notifyRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class IAPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IAPError';
  }
}
