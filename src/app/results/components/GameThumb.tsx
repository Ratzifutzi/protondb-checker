'use client';

import { Box, type BoxProps, Image } from '@chakra-ui/react';
import { Gamepad2 } from 'lucide-react';
import { useState } from 'react';

import { steamIconUrl } from '@/lib/storage';

type Source = 'header' | 'icon' | 'placeholder';

// App ids whose images failed to load. They live for the whole visit, so a
// row that scrolls out of view and back in does not request them again.
const brokenHeaders = new Set<number>();
const brokenIcons = new Set<number>();

function pickSource(appId: number, iconUrl: string | null): Source {
	if (!brokenHeaders.has(appId)) return 'header';
	if (iconUrl && !brokenIcons.has(appId)) return 'icon';
	return 'placeholder';
}

function headerUrl(appId: number): string {
	return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

type GameThumbProps = Omit<BoxProps, 'children'> & {
	appId: number;
	/** Steam icon hash, used when the header image is missing. */
	icon: string | null;
};

/**
 * The Steam header image of a game. Falls back to the small app icon, then
 * to a gamepad placeholder. Decoration only: the game name is next to it.
 */
export default function GameThumb({ appId, icon, ...rest }: GameThumbProps) {
	const iconUrl = steamIconUrl(appId, icon);
	const [source, setSource] = useState<Source>(() =>
		pickSource(appId, iconUrl),
	);

	const handleError = () => {
		if (source === 'header') brokenHeaders.add(appId);
		if (source === 'icon') brokenIcons.add(appId);
		setSource(pickSource(appId, iconUrl));
	};

	return (
		<Box
			w={{ base: '92px', md: '138px' }}
			h={{ base: '43px', md: '64px' }}
			flexShrink={0}
			display="flex"
			alignItems="center"
			justifyContent="center"
			overflow="hidden"
			rounded="l1"
			bg="bg.muted"
			color="fg.subtle"
			{...rest}
		>
			{source === 'header' && (
				<Image
					key="header"
					src={headerUrl(appId)}
					alt=""
					loading="lazy"
					decoding="async"
					w="full"
					h="full"
					fit="cover"
					onError={handleError}
				/>
			)}
			{source === 'icon' && iconUrl && (
				<Image
					key="icon"
					src={iconUrl}
					alt=""
					loading="lazy"
					decoding="async"
					boxSize="8"
					rounded="l1"
					onError={handleError}
				/>
			)}
			{source === 'placeholder' && <Gamepad2 aria-hidden size={24} />}
		</Box>
	);
}
