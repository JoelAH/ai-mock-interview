import { FAQS } from '@/lib/site';
import { PlusIcon } from './icons';
import styles from './landing.module.scss';

// Native <details> — accessible and works with zero JavaScript.
export function Faq() {
  return (
    <section id="faq" className={`${styles.section} ${styles.container}`}>
      <div className={`${styles.sectionHead} ${styles.center}`}>
        <span className={styles.eyebrow}>Questions</span>
        <h2 className={styles.sectionTitle}>Everything you might be wondering.</h2>
      </div>

      <div className={styles.faqGrid}>
        {FAQS.map((faq, i) => (
          <details key={faq.q} className={styles.faqItem} open={i === 0}>
            <summary className={styles.faqQ}>
              {faq.q}
              <span className={styles.faqIcon}>
                <PlusIcon />
              </span>
            </summary>
            <p className={styles.faqA}>{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
