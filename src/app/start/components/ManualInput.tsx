'use client';

import { useColorMode } from '@/components/ui/color-mode';
import { saveCheckInput } from '@/lib/storage';
import {
	Box,
	Button,
	ClientOnly,
	Field,
	Icon,
	Input,
	Link,
	Loader,
	Skeleton,
	Stack,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';
import PrivateCaptcha from '@private-captcha/private-captcha-react';
import { useRouter } from 'next/navigation';
import {
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type FormEvent,
} from 'react';
import { LuExternalLink } from 'react-icons/lu';

const HELP_URL =
	'https://help.steampowered.com/en/faqs/view/2816-BE67-5B69-0FEC';
const PUZZLE_ENDPOINT = 'https://captcha.hyper-tech.ch/puzzle';

/**
 * The widget stores itself on its element under this name (its
 * `storeVariable` option), so the form can reach it before any event.
 */
const WIDGET_PROPERTY = 'protonCheckCaptcha';

/** Height of the captcha widget, kept free while it loads. */
const CAPTCHA_HEIGHT = '100px';

const MESSAGES = {
	emptyId: 'Enter a SteamID, profile link or custom URL name.',
	invalidId:
		'That does not look like a SteamID, profile link or custom URL name.',
	notFound:
		'No Steam profile found. Check the spelling or sign in with Steam instead.',
	profileLimit:
		'This profile was checked too often in the last hour. Please try again later.',
	ipLimit:
		'You checked a lot of profiles in the last hour. Please try again later.',
	captchaRejected: 'The captcha check failed. Please try again.',
	captchaLoad: 'The captcha could not load. Reload the page and try again.',
	server: 'Something went wrong on the server. Please try again in a moment.',
	network: 'Could not reach the server. Check your connection and try again.',
} as const;

/** The public methods of a Private Captcha widget. */
type CaptchaWidget = {
	/** The solution to send for verification, set once solving finished. */
	solution: () => string | null;
	/** Drops the puzzle and the solution and returns to the start state. */
	reset: (options?: Record<string, unknown>) => void;
	/** Loads a puzzle if needed, solves it and then fires the finish event. */
	execute: () => Promise<never>;
};

type CaptchaEventDetail = { widget: unknown };

type CaptchaStatus = 'idle' | 'solving' | 'ready' | 'error';

/** A captcha solution and the key of the widget that solved it. */
type StoredSolution = { solution: string; forKey: string };

function toWidget(value: unknown): CaptchaWidget | null {
	if (typeof value !== 'object' || value === null) return null;
	const { solution, reset, execute } = value as Record<string, unknown>;
	return typeof solution === 'function' &&
		typeof reset === 'function' &&
		typeof execute === 'function'
		? (value as CaptchaWidget)
		: null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when /api/check rejected the captcha solution or did not get one. */
function isCaptchaRejection(status: number, body: string): boolean {
	return (
		status === 400 &&
		(body === 'Captcha verification failed' ||
			body === 'Missing captchaSolution parameter')
	);
}

/** The message for a failed /api/check response. */
function failureMessage(status: number, body: string): string {
	if (status === 400) {
		if (body === 'Missing steamid parameter') return MESSAGES.emptyId;
		if (body === 'Invalid SteamID or vanity URL') return MESSAGES.invalidId;
		if (isCaptchaRejection(status, body)) return MESSAGES.captchaRejected;
		return MESSAGES.server;
	}
	if (status === 404) return MESSAGES.notFound;
	if (status === 429) {
		return body === 'Profile' ? MESSAGES.profileLimit : MESSAGES.ipLimit;
	}
	return MESSAGES.server;
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

async function readText(response: Response): Promise<string> {
	try {
		return (await response.text()).trim();
	} catch {
		return '';
	}
}

type CaptchaSlotProps = {
	widgetKey: string;
	theme: 'light' | 'dark';
	/** Called once the widget exists. `widget` is null if it was not found. */
	onMount: (widget: CaptchaWidget | null, widgetKey: string) => void;
	onInit: (detail: CaptchaEventDetail) => void;
	onStart: (detail: CaptchaEventDetail) => void;
	onFinish: (detail: CaptchaEventDetail) => void;
	onError: (detail: CaptchaEventDetail) => void;
};

/** One captcha widget. The form gives it a new key to get a fresh widget. */
const CaptchaSlot = memo(function CaptchaSlot({
	widgetKey,
	theme,
	onMount,
	onInit,
	onStart,
	onFinish,
	onError,
}: CaptchaSlotProps) {
	const boxRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Effects of children run first, so PrivateCaptcha has created the
		// widget by now, and the widget has stored itself on its element.
		const element = boxRef.current?.querySelector('.private-captcha');
		const widget = element
			? toWidget(Reflect.get(element, WIDGET_PROPERTY))
			: null;
		onMount(widget, widgetKey);
		return () => {
			// A widget cannot be removed. Resetting it stops a widget that is no
			// longer shown from solving and from loading new puzzles on a timer.
			try {
				widget?.reset();
			} catch {
				// Nothing else to do; its element is gone.
			}
		};
	}, [onMount, widgetKey]);

	return (
		<Box ref={boxRef} minH={CAPTCHA_HEIGHT}>
			<PrivateCaptcha
				siteKey={process.env.NEXT_PUBLIC_PRIVATE_CAPTCHA_SITEKEY}
				puzzleEndpoint={PUZZLE_ENDPOINT}
				theme={theme}
				storeVariable={WIDGET_PROPERTY}
				// Full width, in line with the field and the button.
				styles="width: 100%"
				onInit={onInit}
				onStart={onStart}
				onFinish={onFinish}
				onError={onError}
			/>
		</Box>
	);
});

type ManualInputProps = {
	/**
	 * A SteamID to start with. The form then submits on its own as soon as
	 * the captcha is done.
	 */
	initialSteamId?: string;
};

/**
 * The SteamID form. Submitting before the captcha is done queues the submit,
 * and the form sends itself once the captcha finishes.
 */
export default function ManualInput({ initialSteamId }: ManualInputProps) {
	const router = useRouter();
	const { colorMode } = useColorMode();
	const theme = colorMode === 'light' ? 'light' : 'dark';

	const [value, setValue] = useState(initialSteamId ?? '');
	const [error, setError] = useState('');
	const [queued, setQueued] = useState(Boolean(initialSteamId));
	const [requesting, setRequesting] = useState(false);
	const [widgetCount, setWidgetCount] = useState(0);
	const [captcha, setCaptcha] = useState<{
		status: CaptchaStatus;
		key: string | null;
	}>({ status: 'idle', key: null });

	// A new key mounts a new widget: when the theme changes, or when the
	// widget cannot be reset.
	const widgetKey = `${widgetCount}-${theme}`;

	// The captcha callbacks keep one identity, because the widget wrapper
	// binds its listeners again whenever they change. So everything they read
	// lives in refs, and the refs mirror the state that render needs.
	const valueRef = useRef(initialSteamId ?? '');
	const queuedRef = useRef(Boolean(initialSteamId));
	const requestingRef = useRef(false);
	const widgetRef = useRef<CaptchaWidget | null>(null);
	const widgetKeyRef = useRef<string | null>(null);
	const solutionRef = useRef<StoredSolution | null>(null);
	const captchaRetriedRef = useRef(false);
	const abortRef = useRef<AbortController | null>(null);
	const submitButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		router.prefetch('/fetch');
	}, [router]);

	useEffect(() => {
		// Leaving the page cancels a running request, so a late answer cannot
		// open /fetch from another page.
		return () => abortRef.current?.abort();
	}, []);

	const updateQueued = useCallback((next: boolean) => {
		queuedRef.current = next;
		setQueued(next);
	}, []);

	const updateRequesting = useCallback((next: boolean) => {
		requestingRef.current = next;
		setRequesting(next);
	}, []);

	/** The captcha cannot work: show why, and stop waiting for it. */
	const failCaptcha = useCallback(() => {
		solutionRef.current = null;
		setCaptcha({ status: 'error', key: widgetKeyRef.current });
		updateQueued(false);
	}, [updateQueued]);

	/**
	 * Starts solving on the current widget. Its finish event follows, also
	 * when it already solved a puzzle in the background, in which case the
	 * event fires before this returns. False when no widget is known yet.
	 */
	const solveCaptcha = useCallback((): boolean => {
		const widget = widgetRef.current;
		if (!widget) return false;
		try {
			void widget.execute();
		} catch {
			failCaptcha();
		}
		return true;
	}, [failCaptcha]);

	/** Drops the used solution and solves a new puzzle in the background. */
	const renewCaptcha = useCallback(() => {
		solutionRef.current = null;
		const widget = widgetRef.current;
		if (widget) {
			try {
				widget.reset();
				void widget.execute();
				return;
			} catch {
				// Mount a new widget instead.
			}
		}
		widgetRef.current = null;
		setWidgetCount((count) => count + 1);
	}, []);

	const sendRequest = useCallback(
		async (steamid: string, captchaSolution: string) => {
			const controller = new AbortController();
			abortRef.current = controller;
			updateRequesting(true);
			setError('');

			let failure: { message: string; captcha: boolean };
			try {
				const response = await fetch('/api/check', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ steamid, captchaSolution }),
					signal: controller.signal,
				});
				if (response.ok) {
					const data = await readJson(response);
					if (controller.signal.aborted) return;
					const saved = isRecord(data)
						? saveCheckInput({ profile: data.profile, games: data.games })
						: null;
					if (saved?.ok) {
						// The button keeps loading until /fetch replaces this page.
						router.push('/fetch');
						return;
					}
					failure = { message: MESSAGES.server, captcha: false };
				} else {
					const body = await readText(response);
					failure = {
						message: failureMessage(response.status, body),
						captcha: isCaptchaRejection(response.status, body),
					};
				}
			} catch {
				failure = { message: MESSAGES.network, captcha: false };
			}
			if (controller.signal.aborted) return;

			abortRef.current = null;
			updateRequesting(false);
			// A solution works only once, so every failed request needs a new one.
			if (failure.captcha && !captchaRetriedRef.current) {
				// The solution may have expired. Try once more without a message.
				captchaRetriedRef.current = true;
				updateQueued(true);
				renewCaptcha();
				return;
			}
			setError(failure.message);
			updateQueued(false);
			renewCaptcha();
		},
		[renewCaptcha, router, updateQueued, updateRequesting],
	);

	/**
	 * Sends the form when a solution is ready. Otherwise queues it, and
	 * onFinish calls this again once the captcha is done.
	 */
	const trySubmit = useCallback(() => {
		if (requestingRef.current) return;
		const steamid = valueRef.current.trim();
		if (!steamid) {
			updateQueued(false);
			setError(MESSAGES.emptyId);
			return;
		}

		const stored = solutionRef.current;
		solutionRef.current = null;
		if (stored && stored.forKey === widgetKeyRef.current) {
			updateQueued(false);
			void sendRequest(steamid, stored.solution);
			return;
		}

		updateQueued(true);
		setCaptcha((current) =>
			current.status === 'error' ? { status: 'idle', key: null } : current,
		);
		// Without a widget yet, onMount or onInit starts solving instead.
		solveCaptcha();
	}, [sendRequest, solveCaptcha, updateQueued]);

	// Starting the captcha for a queued form (a SteamID from the address).
	// ClientOnly mounts the widget one commit after this component mounts,
	// so an effect here would run before the widget exists. CaptchaSlot
	// reports from its own effect instead, which runs after the effects of
	// PrivateCaptcha that create the widget. Focus inside the form alone
	// would only solve in the background without a finish event, so this
	// calls execute(), which also fires the event and moves no focus (phones
	// keep their keyboard closed).
	const handleWidgetMount = useCallback(
		(widget: CaptchaWidget | null, key: string) => {
			widgetRef.current = widget;
			widgetKeyRef.current = key;
			// A solution belongs to the widget that solved it.
			solutionRef.current = null;
			if (!queuedRef.current || requestingRef.current) return;
			if (!solveCaptcha()) {
				// The widget did not store itself. Focus inside the form makes it
				// load a puzzle, and onInit then starts solving.
				submitButtonRef.current?.focus({ preventScroll: true });
			}
		},
		[solveCaptcha],
	);

	const handleInit = useCallback(
		(detail: CaptchaEventDetail) => {
			const widget = toWidget(detail.widget);
			if (widget) widgetRef.current = widget;
			// A new puzzle (first load, reset, or the old one expired) replaces
			// an earlier solution.
			solutionRef.current = null;
			// A puzzle loaded because of focus is solved without a finish event.
			// A queued form needs that event, so ask for it.
			if (queuedRef.current && !requestingRef.current) solveCaptcha();
		},
		[solveCaptcha],
	);

	const handleStart = useCallback((detail: CaptchaEventDetail) => {
		const widget = toWidget(detail.widget);
		if (widget) widgetRef.current = widget;
		setCaptcha({ status: 'solving', key: widgetKeyRef.current });
	}, []);

	const handleFinish = useCallback(
		(detail: CaptchaEventDetail) => {
			const widget = toWidget(detail.widget);
			const forKey = widgetKeyRef.current;
			if (!widget || forKey === null) return;
			widgetRef.current = widget;
			const solution = widget.solution();
			if (typeof solution !== 'string' || solution === '') return;
			solutionRef.current = { solution, forKey };
			setCaptcha({ status: 'ready', key: forKey });
			if (queuedRef.current) trySubmit();
		},
		[trySubmit],
	);

	const handleError = useCallback(
		(detail: CaptchaEventDetail) => {
			const widget = toWidget(detail.widget);
			if (widget) widgetRef.current = widget;
			failCaptcha();
		},
		[failCaptcha],
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (requestingRef.current) return;
		// Each press allows one silent retry with a new captcha solution.
		captchaRetriedRef.current = false;
		trySubmit();
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		valueRef.current = event.target.value;
		setValue(event.target.value);
		if (error) setError('');
	};

	const showQueued = queued && !requesting;
	const captchaFailed = captcha.status === 'error' && captcha.key === widgetKey;

	return (
		// Before hydration the browser submits the form itself. The address it
		// opens fills in the SteamID and submits again once the page is ready.
		<form noValidate action="/start" method="get" onSubmit={handleSubmit}>
			<Stack gap={4}>
				<Field.Root invalid={error !== ''} readOnly={requesting}>
					<Field.Label>SteamID, profile link or custom URL name</Field.Label>
					<Input
						name="steamid"
						size="lg"
						value={value}
						onChange={handleChange}
						placeholder="76561198000000000 or steamcommunity.com/id/yourname"
						aria-required
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
						enterKeyHint="go"
						// Keep password managers and autofill out of this field.
						autoComplete="one-time-code"
						data-1p-ignore
						data-lpignore="true"
						data-bwignore
						data-form-type="other"
					/>
					<Field.ErrorText role="alert" textStyle="sm">
						{error}
					</Field.ErrorText>
					<Link
						href={HELP_URL}
						target="_blank"
						rel="noopener noreferrer"
						textStyle="sm"
						colorPalette="blue"
						variant="underline"
					>
						How do I find my SteamID?
						<Icon boxSize="3.5">
							<LuExternalLink />
						</Icon>
						<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
					</Link>
				</Field.Root>

				<Box>
					{/* Client only: the theme is only known in the browser, and the
					    widget is created there anyway. */}
					<ClientOnly fallback={<Skeleton h={CAPTCHA_HEIGHT} />}>
						<CaptchaSlot
							key={widgetKey}
							widgetKey={widgetKey}
							theme={theme}
							onMount={handleWidgetMount}
							onInit={handleInit}
							onStart={handleStart}
							onFinish={handleFinish}
							onError={handleError}
						/>
					</ClientOnly>
					<Box aria-live="polite" textStyle="sm">
						{captchaFailed ? (
							<Text mt={2} color="fg.error">
								{MESSAGES.captchaLoad}
							</Text>
						) : showQueued ? (
							<Text mt={2} color="fg.muted">
								The captcha runs in the background and takes a few seconds.
							</Text>
						) : null}
					</Box>
				</Box>

				<Button
					ref={submitButtonRef}
					type="submit"
					size="lg"
					w="full"
					// Marked disabled without the disabled attribute, which would take
					// keyboard focus away. The submit handler ignores presses meanwhile.
					aria-disabled={requesting || undefined}
					data-disabled={requesting || undefined}
				>
					<Loader
						visible={requesting || showQueued}
						text={requesting ? 'Loading profile' : 'Waiting for captcha'}
					>
						Find profile
					</Loader>
				</Button>
			</Stack>
		</form>
	);
}
