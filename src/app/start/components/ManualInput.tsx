'use client';

import PublicProfileNotice from '@/components/partials/publicProfileNotice';
import {
	Button,
	Card,
	Center,
	Field,
	HStack,
	Input,
	Link,
	Text,
} from '@chakra-ui/react';
import PrivateCaptcha from '@private-captcha/private-captcha-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

declare global {
	interface Window {
		privateCaptcha?: {
			render: (element: HTMLElement, options: { sitekey: string }) => void;
		};
	}
}

type props = {
	setSyncMethod: (id: number) => void;
};

export default function ManualInput({ setSyncMethod }: props) {
	const [captchaPassed, setCaptchaPassed] = useState(false);
	const [captchaKey, setCaptchaKey] = useState(0);
	const captchaSolution = useRef<string | null>(null);
	const steamIdInput = useRef<HTMLInputElement>(null);

	const [errorText, setErrorText] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);

	const router = useRouter();

	const reloadCaptcha = () => {
		captchaSolution.current = null;
		setCaptchaPassed(false);
		setCaptchaKey((prev) => prev + 1);
	};

	const handleCaptchaFinished = (detail: {
		widget: { solution: () => string };
		element: HTMLElement;
	}) => {
		setCaptchaPassed(true);
		captchaSolution.current = detail.widget.solution();
		console.log('Captcha solved!', captchaSolution.current);
	};

	function handleSubmit() {
		if (!captchaPassed) return;
		setLoading(true);
		setErrorText("")

		// POST
		fetch('/api/check', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				steamid: steamIdInput.current?.value || '',
				captchaSolution: captchaSolution.current,
			}),
		})
			.then((response) => {
				if (!response.ok) {
					switch (response.status) {
						case 400:
							setErrorText("Invalid input.")
							break;
						case 404:
							setErrorText("User not found.")
							break;
						case 429:
							setErrorText("You have requested too many users. Try again in a few hours.")
							break;
						default:
							setErrorText("Unexpected server error.")
							break;
					}

					return;
				}

				return response.json()
			})
			.then((data) => {
				if (errorText) return;

				console.log('Loaded games successfully');
				localStorage.setItem('games', JSON.stringify(data.games));
				localStorage.setItem('profile', JSON.stringify(data.profile));
				router.push('/fetch');
			})
			.catch((error) => {
				console.log('Error:', error);
				setErrorText("Unexpected client error.")
			})
			.finally(() => {
				reloadCaptcha();
				setLoading(false);
			});
	}

	return (
		<>
			<PublicProfileNotice />
			<HStack mb={5}>
				<Card.Description>Using SteamID to load games.</Card.Description>
				<Text
					onClick={() => {
						setSyncMethod(2);
					}}
					cursor={'pointer'}
					fontSize={'sm'}
					color={'blue.400'}
					display={loading ? "none" : "block"}
				>
					Link account instead
				</Text>
			</HStack>
			<form>
				<HStack>
					<Field.Root required disabled={loading} invalid={errorText !== ""}>
						<Field.Label>
							SteamID, Vanity URL or vanity username<Field.RequiredIndicator />
						</Field.Label>
						<HStack w={"full"}>
							<Input
								type="text"
								placeholder="Enter your SteamID, Vanity URL or Vanity Username"
								ref={steamIdInput}
							/>
							<Button
								type="button"
								disabled={!captchaPassed}
								onClick={handleSubmit}
								loading={loading}
							>
								Check ID
							</Button>
						</HStack>
						<Field.ErrorText>{errorText}</Field.ErrorText>
						<Link href='https://help.steampowered.com/en/faqs/view/2816-BE67-5B69-0FEC' target='_blank'>
							<Field.HelperText color={'blue.400'} cursor={'button'}>
								How do I find this?
							</Field.HelperText>
						</Link>
					</Field.Root>
				</HStack>
				<Center>
					<PrivateCaptcha
						key={captchaKey}
						siteKey={process.env.NEXT_PUBLIC_PRIVATE_CAPTCHA_SITEKEY}
						theme="dark"
						onFinish={handleCaptchaFinished}
					/>
				</Center>
			</form>
		</>
	);
}
