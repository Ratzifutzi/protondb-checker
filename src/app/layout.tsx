import { Provider } from '@/components/ui/provider';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#C70349',
};


export const metadata: Metadata = {
	title: {
		default: 'ProtonDB Check - Scan Your Steam Library for Linux',
		template: '%s | ProtonDB Check',
	},
	description:
		'An open-source tool to instantly check your Steam library against ProtonDB to see which games run on Linux, Steam Deck, or via Proton/Wine. No login, no tracking.',
	keywords: [
		'ProtonDB',
		'ProtonDB Check',
		'Ratzifutzi',
		'open source linux tools',
		'steam deck compatibility',
		'linux gaming checker',
		'protondb scanner',
		'steam library linux',
		'oss gaming tools',
		"protondb library"
	],
	authors: [{ name: 'Ratzifutzi' }],
	creator: 'Ratzifutzi',
	publisher: 'Ratzifutzi',
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	openGraph: {
		title: 'ProtonDB Check: Check if your games run on Linux',
		description:
			'A lightweight, open-source scanner. Paste your Steam ID or library and get instant compatibility ratings from ProtonDB. Built for the Linux community.',
		url: process.env.HOSTED_DOMAIN,
		siteName: 'ProtonDB Check',
		images: [
			{
				url: `${process.env.HOSTED_DOMAIN}/banner-og.png`,
				width: 1200,
				height: 630,
				alt: 'ProtonDB Check Logo',
			},
		],
		locale: 'en_US',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'ProtonDB Check by Ratzifutzi',
		description:
			'Open-source Steam library scanner for Linux. Check ProtonDB compatibility instantly. No accounts required.',
		images: [`${process.env.HOSTED_DOMAIN}/banner-og.png`],
	},
	alternates: {
		canonical: process.env.HOSTED_DOMAIN,
	},
	icons: {
		icon: `${process.env.HOSTED_DOMAIN}/proton-logo.svg`,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					defer
					src="https://cdn.privatecaptcha.com/widget/js/privatecaptcha.js"
				></script>
			</head>
			<body>
				<Provider>
					<Toaster />
					{children}</Provider>
			</body>
		</html>
	);
}
