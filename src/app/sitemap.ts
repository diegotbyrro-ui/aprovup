import type { MetadataRoute } from 'next';
import { aprovupConfig } from '@/lib/aprovup-config';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${aprovupConfig.siteUrl}/site`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${aprovupConfig.siteUrl}/site/politica-de-privacidade`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${aprovupConfig.siteUrl}/site/termos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];
}
