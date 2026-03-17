'use client';

import CardFooter from '@/components/partials/footer';
import { AbsoluteCenter, Box, Card, Text } from '@chakra-ui/react';

export default function Start() {
	return (
		<AbsoluteCenter>
			<Card.Root width={'600px'} minHeight={'550px'}>
				<Card.Body>
					<Card.Header mb={4}>
						<Text textAlign={'center'} fontSize={'xl'} fontWeight={'black'}>
							Privacy Policy
						</Text>
					</Card.Header>
					<Box color={'fg.subtle'} maxH={"400px"} overflowY={"scroll"}>
						<Text>Your data will <strong>NEVER</strong> be sold to ANY third-party. The data collected is <strong>ONLY for operational reasons.</strong> Data is not collected for advertisement reasons.</Text>
						<br />
						<Text fontWeight={'bold'} fontSize={'lg'}>
							Data collected
						</Text>
						<Box as={'ul'} listStyleType={'circle'} pl={5}>
							<li>IP Address</li>
							<li>Browser User Agent</li>
							<li>Access time</li>
							<li>Page viewed</li>
							<li>Referrer</li>
							<li>Browser Language</li>
							<li>Browser Type</li>
							<li>Operating System</li>
							<li>Steam ID*</li>
						</Box>
						<br />
						<Text fontWeight={'bold'} fontSize={'lg'}>
							Data usage
						</Text>
						<Box as={'ul'} listStyleType={'circle'} pl={5}>
							<li>Basic functionality</li>
							<li>System security</li>
							<li>Rate limiting</li>
							<li>Spam protection</li>
						</Box>
						<br />
						<Text fontWeight={'bold'} fontSize={'lg'}>
							Contact
						</Text>
						<Box as={'ul'} listStyleType={'circle'} pl={5}>
							<li>Privacy: webmaster@hyper-tech.ch</li>
							<li>Webmaster: webmaster@hyper-tech.ch</li>
							<li>Security Reports: security@hyper-tech.ch</li>
						</Box>
						<br />
						<Text>Logs are only kept for 3 months. If a session is deemed harmful, the IP Address will be reported to https://www.abuseipdb.com/ and banned from all services on this server.</Text>
						<br />
						<Text>* The Steam ID is saved for spam protection and rate limits.</Text>
					</Box>
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter>
	);
}
