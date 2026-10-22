import { FaDiscord, FaGithub, FaGoogle, FaOpenid, FaMicrosoft, FaQrcode } from 'react-icons/fa';
import { MicrosoftIcon } from '~/components/icons/Microsoft';
import { DiscordIcon } from '~/components/icons/Discord';
import { GoogleIcon } from '~/components/icons/Google';
import { GitHubIcon } from '~/components/icons/GitHub';
import { Icon, IconProps } from '@chakra-ui/react';
import { IconType } from 'react-icons/lib';

export type PlatformButton = {
	key: string;
	name: string;
	action: string;
	color: string;
	icon: IconType;
	faIcon: (props: IconProps) => JSX.Element;
	show?: boolean;
};

export const qrLoginButton = {
	key: 'qr',
	name: 'QR Code',
	action: 'Log in with',
	color: '#83CEDB',
	icon: FaQrcode,
	faIcon: (props: IconProps) => <Icon as={FaQrcode} {...props} />,
};

export const oidcLoginButton = (oidcDisplayName = 'OpenID Connect') => ({
	key: 'oidc',
	name: oidcDisplayName,
	action: 'Log in with',
	color: '#F0B88E',
	icon: FaOpenid,
	faIcon: (props: IconProps) => <Icon as={FaOpenid} {...props} />,
});

export function platformButtons(allowedPlatforms: string[]) {
	return [
		{
			key: 'google',
			name: 'Google',
			action: 'Continue with',
			color: '#FD9B9B',
			icon: GoogleIcon,
			faIcon: (props: IconProps) => <Icon as={FaGoogle} {...props} />,
			show: allowedPlatforms.includes('google'),
		},
		{
			key: 'microsoft',
			name: 'Microsoft',
			action: 'Continue with',
			color: '#7FDCA6',
			icon: MicrosoftIcon,
			faIcon: (props: IconProps) => <Icon as={FaMicrosoft} {...props} />,
			show: allowedPlatforms.includes('microsoft'),
		},
		{
			key: 'github',
			name: 'GitHub',
			action: 'Continue with',
			color: '#A7AFBA',
			icon: GitHubIcon,
			faIcon: (props: IconProps) => <Icon as={FaGithub} {...props} />,
			show: allowedPlatforms.includes('github'),
		},
		{
			key: 'discord',
			name: 'Discord',
			action: 'Continue with',
			color: '#8C96F4',
			icon: DiscordIcon,
			faIcon: (props: IconProps) => <Icon as={FaDiscord} {...props} />,
			show: allowedPlatforms.includes('discord'),
		},
	].filter((button) => button.show);
}
