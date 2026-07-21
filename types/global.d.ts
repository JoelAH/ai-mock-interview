/* Global type augmentations */

interface Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}
