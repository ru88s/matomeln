import { MetadataRoute } from 'next';

export const dynamic = 'error';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://matomeln.pages.dev';

  return [
    {
      url: baseUrl,
      lastModified: new Date('2025-09-29'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date('2025-09-29'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2025-09-29'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2025-09-29'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/site-map`,
      lastModified: new Date('2025-09-29'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}