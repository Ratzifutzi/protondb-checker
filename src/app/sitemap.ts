import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: `${process.env.HOSTED_DOMAIN}/`,
			lastModified: new Date(),
			changeFrequency: 'yearly',
			priority: 1.0,
		},
	];
}
