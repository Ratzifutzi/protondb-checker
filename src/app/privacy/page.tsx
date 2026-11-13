import { Card, Heading, Link, List, Span, Stack, Text } from '@chakra-ui/react';
import type { Metadata } from 'next';
import Image from 'next/image';
import NextLink from 'next/link';

import CardFooter from '@/components/partials/footer';
import PageShell from '@/components/partials/pageShell';

export const metadata: Metadata = {
	title: 'Privacy Policy',
};

/** Keeps an email or web address on one line, not broken at a hyphen. */
function Address({ children }: { children: string }) {
	return <Span whiteSpace="nowrap">{children}</Span>;
}

export default function PrivacyPage() {
	return (
		<PageShell>
			<Card.Body gap={6}>
				<Stack gap={4}>
					{/* The footer opens this page in the same tab, so offer a way back. */}
					<Link
						asChild
						alignSelf="start"
						color="fg"
						fontWeight="semibold"
						gap={2}
					>
						<NextLink href="/">
							<Image
								src="/proton-logo.svg"
								alt=""
								width={28}
								height={28}
								loading="eager"
							/>
							ProtonDB Check
						</NextLink>
					</Link>
					<Heading as="h1" size="2xl">
						Privacy Policy
					</Heading>
				</Stack>

				<Stack gap={6} color="fg.muted">
					<Text>
						Your data will <strong>NEVER</strong> be sold to ANY third-party.
						The data collected is <strong>ONLY for operational reasons.</strong>{' '}
						Data is not collected for advertisement reasons.
					</Text>

					<Stack gap={2}>
						<Heading as="h2" size="lg" color="fg">
							Data collected
						</Heading>
						<List.Root ps={5} gap={1}>
							<List.Item>IP Address</List.Item>
							<List.Item>Browser User Agent</List.Item>
							<List.Item>Access time</List.Item>
							<List.Item>Page viewed</List.Item>
							<List.Item>Referrer</List.Item>
							<List.Item>Browser Language</List.Item>
							<List.Item>Browser Type</List.Item>
							<List.Item>Operating System</List.Item>
							<List.Item>Steam ID*</List.Item>
						</List.Root>
					</Stack>

					<Stack gap={2}>
						<Heading as="h2" size="lg" color="fg">
							Data usage
						</Heading>
						<List.Root ps={5} gap={1}>
							<List.Item>Basic functionality</List.Item>
							<List.Item>System security</List.Item>
							<List.Item>Rate limiting</List.Item>
							<List.Item>Spam protection</List.Item>
						</List.Root>
					</Stack>

					<Stack gap={2}>
						<Heading as="h2" size="lg" color="fg">
							Contact
						</Heading>
						<List.Root ps={5} gap={1}>
							<List.Item>
								Privacy: <Address>webmaster@hyper-tech.ch</Address>
							</List.Item>
							<List.Item>
								Webmaster: <Address>webmaster@hyper-tech.ch</Address>
							</List.Item>
							<List.Item>
								Security Reports: <Address>security@hyper-tech.ch</Address>
							</List.Item>
						</List.Root>
					</Stack>

					<Text>
						Logs are only kept for 3 months. If a session is deemed harmful, the
						IP Address will be reported to{' '}
						<Address>https://www.abuseipdb.com/</Address> and banned from all
						services on this server.
					</Text>

					<Text fontSize="sm">
						* The Steam ID is saved for spam protection and rate limits.
					</Text>
				</Stack>
			</Card.Body>
			<CardFooter />
		</PageShell>
	);
}
