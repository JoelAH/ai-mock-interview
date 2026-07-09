import { Logo } from './icons';
import { Waveform } from './Waveform';
import { SITE } from '@/lib/site';
import styles from './landing.module.scss';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how' },
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/' },
      { label: 'Contact', href: '/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'FAQ', href: '/#faq' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <span className={styles.brand}>
            <Logo />
            <span>
              {SITE.name}
              <span className={styles.brandDot}>.</span>
            </span>
          </span>
          <p className={styles.footerBlurb}>
            The voice-first way to rehearse technical interviews — so the real one feels like one
            more rep.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title} className={styles.footerCol}>
            <p className={styles.footerColTitle}>{col.title}</p>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={styles.footerLink}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.footerBottomInner}>
          <span>
            &copy; {new Date().getFullYear()} {SITE.name}. Built for people about to crush an
            interview.
          </span>
          <Waveform bars={5} />
        </div>
      </div>
    </footer>
  );
}
