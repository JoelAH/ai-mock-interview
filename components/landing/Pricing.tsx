import { BETA_MODE } from '@/lib/beta';
import { PLANS } from '@/lib/site';
import { CheckIcon, ShieldIcon } from './icons';
import styles from './landing.module.scss';

export function Pricing() {
  return (
    <section id="pricing" className={`${styles.section} ${styles.container}`}>
      <div className={`${styles.sectionHead} ${styles.center}`}>
        <span className={styles.eyebrow}>Pricing</span>
        <h2 className={styles.sectionTitle}>Plans that scale with your interview season.</h2>
        <p className={styles.sectionLede}>
          Start free to feel the loop. Step up as the loop heats up — and cancel the moment you sign
          the offer.
        </p>
      </div>

      <div className={styles.planGrid}>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`${styles.plan}${plan.featured ? ` ${styles.planFeatured}` : ''}`}
          >
            <div className={styles.planHead}>
              <h3 className={styles.planName}>{plan.name}</h3>
              {plan.featured && <span className={styles.planBadge}>Most popular</span>}
            </div>

            <div>
              <div className={styles.planPriceRow}>
                <span className={styles.planPrice}>{plan.price}</span>
                <span className={styles.planCadence}>{plan.cadence}</span>
              </div>
              <p className={styles.planBlurb}>{plan.blurb}</p>
            </div>

            <ul className={styles.perks}>
              {plan.perks.map((perk) => (
                <li key={perk} className={styles.perk}>
                  <CheckIcon />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            {!BETA_MODE && (
              <a
                href="/sign-up"
                className={`${styles.btn} ${plan.featured ? styles.btnPrimary : styles.btnGhost} ${styles.btnBlock} ${styles.btnLg}`}
              >
                {plan.cta}
              </a>
            )}
          </div>
        ))}
      </div>

      <p className={styles.planNote}>
        <ShieldIcon />
        Cancel anytime. No contracts, no recordings shared with anyone.
      </p>
    </section>
  );
}
