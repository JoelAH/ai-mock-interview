// BlogPosting + BreadcrumbList structured data for a single article.
// Improves eligibility for rich results and gives AI engines clean, attributable
// metadata (author, publisher, dates) to cite. Looks post data up from lib/blog
// by slug so it never drifts from the visible page.
import { SITE, AUTHOR } from '@/lib/site';
import { getBlogPost } from '@/lib/blog';

export function ArticleJsonLd({ slug }: { slug: string }) {
  const post = getBlogPost(slug);
  if (!post) return null;

  const url = `${SITE.url}/blog/${post.slug}`;

  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}/#article`,
      headline: post.title,
      description: post.description,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      datePublished: post.isoDate,
      dateModified: post.isoDate,
      keywords: post.keywords.join(', '),
      inLanguage: 'en-US',
      author: {
        '@type': 'Organization',
        name: AUTHOR.name,
        url: SITE.url,
      },
      publisher: { '@id': `${SITE.url}/#organization` },
      isPartOf: { '@id': `${SITE.url}/#website` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE.url}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  const data = { '@context': 'https://schema.org', '@graph': graph };

  return (
    <script
      type="application/ld+json"
      // Built from our own constants — safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
