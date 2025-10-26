import { Button, ButtonProps, IconButton, IconButtonProps } from '@chakra-ui/react';
import { Link, LinkProps } from '@remix-run/react';
import { forwardRef } from 'react';

export const LinkButton = forwardRef<HTMLButtonElement, ButtonProps & LinkProps>(({ ...props }, ref) => {
	return (
		<Button
			ref={ref}
			as={props.isDisabled ? undefined : Link}
			{...props}
		/>
	);
});

LinkButton.displayName = 'LinkButton';

export const IconLinkButton = forwardRef<HTMLButtonElement, IconButtonProps & LinkProps>(({ icon, ...props }, ref) => {
	return (
		<IconButton
			ref={ref}
			as={props.isDisabled ? undefined : Link}
			icon={icon}
			{...props}
		/>
	);
});

IconLinkButton.displayName = 'IconLinkButton';
