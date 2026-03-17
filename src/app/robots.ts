import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: ['/fetch', '/results', '/start'],
			},
		],
		sitemap: `${process.env.HOSTED_DOMAIN}/sitemap.xml`,
	};
}
