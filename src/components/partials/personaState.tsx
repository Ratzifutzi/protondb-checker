import { Box } from '@chakra-ui/react';

type PersonaInfo = { label: string; color: string };

/** Steam persona states, indexed by their number. */
const PERSONA_STATES: readonly PersonaInfo[] = [
	{ label: 'Offline', color: 'fg.subtle' },
	{ label: 'Online', color: 'green.solid' },
	{ label: 'Busy', color: 'red.solid' },
	{ label: 'Away', color: 'orange.solid' },
	{ label: 'Snooze', color: 'orange.solid' },
	{ label: 'Looking to trade', color: 'blue.solid' },
	{ label: 'Looking to play', color: 'blue.solid' },
];

type PersonaStateProps = {
	/** Steam persona state, from 0 (offline) to 6 (looking to play). */
	persona?: number | null;
};

/**
 * A small dot in the color of a Steam persona state. Decoration only, so it
 * is hidden from screen readers. Renders nothing for an unknown state.
 */
export default function PersonaState({ persona }: PersonaStateProps) {
	const state: PersonaInfo | undefined =
		typeof persona === 'number' && Number.isInteger(persona) && persona >= 0
			? PERSONA_STATES[persona]
			: undefined;
	if (!state) return null;

	return (
		<Box
			as="span"
			aria-hidden
			title={state.label}
			display="inline-block"
			flexShrink={0}
			boxSize="2.5"
			rounded="full"
			bg={state.color}
		/>
	);
}
