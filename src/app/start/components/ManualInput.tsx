'use client';

import PublicProfileNotice from '@/components/partials/publicProfileNotice';
import { toaster } from '@/components/ui/toaster';
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
import { useEffect, useRef, useState } from 'react';

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

	// Check URL params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search)

		const errorParam = params.get("error")
		const steamIdParam = params.get("steamid")

		if (errorParam) {
			toaster.error({
				title: "Server Error",
				description: "Steam experienced a server error and could not provide the logged in account. Please try again or use manual input.",
				closable: true,
				duration: 30_000,
			})
		}

		if (steamIdParam) {
			const decodedSteamId = decodeURIComponent(steamIdParam)

			try {
				if (steamIdInput.current) {
					steamIdInput.current.value = decodedSteamId;
				}
			} catch {
				toaster.error({
					title: "Client Error",
					description: "Client Error. Please try manual input.",
					closable: true,
					duration: 30_000,
				})
			}
		}
	}, [setSyncMethod, steamIdInput])

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
			.then(async (response) => {
				if (!response.ok) {
					switch (response.status) {
						case 400:
							setErrorText("Invalid input.")
							break;
						case 404:
							setErrorText("User not found.")
							break;
						case 429:
							const text = await response.text();
							if (text == "Profile") {
								setErrorText("This profile has been requested too many times. Try a different one.")
							} else {
								setErrorText("You have requested too many users. Try again in a few hours.")
							}
							break;
						default:
							setErrorText("Unexpected server error.")
							break;
					}

					return;
				}

				const data = await response.json();

				console.log('Loaded games successfully');
				localStorage.setItem('games', JSON.stringify(data.games));
				localStorage.setItem('profile', JSON.stringify(data.profile));
				router.push('/fetch');
			})
			.catch((error) => {
				console.log('Error:', error);
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
								name="steam-identifier"
								id="steam-identifier"
								autoComplete="one-time-code"
								data-1p-ignore
								data-lpignore="true"
								data-bwignore
								data-form-type="other"
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
								How do I find my ID?
							</Field.HelperText>
						</Link>
					</Field.Root>
				</HStack>
				<Center mt={10}>
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
