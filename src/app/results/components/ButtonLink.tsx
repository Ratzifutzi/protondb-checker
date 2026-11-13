import { Button, type ButtonProps } from '@chakra-ui/react';
import NextLink from 'next/link';

type ButtonLinkProps = Omit<ButtonProps, 'asChild' | 'type'> & {
	href: string;
};

/** A link to another page of the site that looks like a button. */
export default function ButtonLink({
	href,
	children,
	...rest
}: ButtonLinkProps) {
	return (
		// Button sets type="button" by default, which is not valid on a link.
		<Button asChild type={undefined} {...rest}>
			<NextLink href={href}>{children}</NextLink>
		</Button>
	);
}
