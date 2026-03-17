import { Provider } from '@/components/ui/provider';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
	title: 'Proton Checker',
	description: 'Check if your Steam Games are compatible with Linux',
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
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
