import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The results page is a client component and cannot export metadata itself.
export const metadata: Metadata = {
	title: 'Results',
};

export default function ResultsLayout({ children }: { children: ReactNode }) {
	return children;
}
