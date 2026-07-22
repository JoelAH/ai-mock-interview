// Structured data for SEO / rich results. Rendered server-side as a script tag.
// Reuses the same content arrays the visible page uses, so they never drift.
import { FAQS, FEATURES, PLANS, SITE, AUTHOR } from '@/lib/site';

export function JsonLd() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      // Verifiable presence — strengthens entity trust for AI + search engines.
      sameAs: AUTHOR.sameAs,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: 'en-US',
      publisher: { '@id': `${SITE.url}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE.url}/#software`,
      name: SITE.name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: SITE.description,
      url: SITE.url,
      publisher: { '@id': `${SITE.url}/#organization` },
      // Concrete capabilities — helps AI engines describe what the product does.
      featureList: FEATURES.map((f) => f.title),
      offers: PLANS.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: p.price.replace(/[^0-9.]/g, '') || '0',
        priceCurrency: 'USD',
      })),
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE.url}/#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];

  const data = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <script
      type="application/ld+json"
      // Content is built from our own constants, so this is safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
