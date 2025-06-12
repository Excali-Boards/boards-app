import { ButtonProps, Button } from '@chakra-ui/react';
import { LinkProps, Link } from '@remix-run/react';

export type PopoverLinkProps = {
	to: string;
	children: React.ReactNode;
	disableTransition?: boolean;
} & ButtonProps & LinkProps;

export function PopoverLink({ to, children, ...props }: PopoverLinkProps) {
	return (
		<Button
			_hover={{ bg: 'alpha100', textDecoration: 'none' }}
			_active={{ bg: 'alpha200' }}
			w='100%'
			as={Link}
			to={to}
			px={2}
			rounded={'lg'}
			variant={'ghost'}
			alignItems={'center'}
			alignContent={'center'}
			justifyContent={'start'}
			display={'flex'}
			{...props}
		>
			{children}
		</Button>
	);
}

export type PopoverButtonProps = {
	children: React.ReactNode;
} & ButtonProps;

export function PopoverButton({ children, ...props }: PopoverButtonProps) {
	return (
		<Button
			_hover={{ bg: 'alpha100' }}
			_active={{ bg: 'alpha200' }}
			w='100%'
			px={2}
			rounded={'lg'}
			variant={'ghost'}
			alignItems={'center'}
			alignContent={'center'}
			justifyContent={'start'}
			display={'flex'}
			{...props}
		>
			{children}
		</Button>
	);
}
