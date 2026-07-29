import type { MetadataRoute } from 'next';
import { aprovupConfig } from '@/lib/aprovup-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/site', '/site/obrigado', '/site/politica-de-privacidade', '/site/termos'],
        disallow: ['/site/leads', '/api/'],
      },
    ],
    sitemap: `${aprovupConfig.siteUrl}/sitemap.xml`,
    host: aprovupConfig.siteUrl,
  };
}
