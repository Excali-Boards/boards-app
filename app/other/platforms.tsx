import { FaDiscord, FaGithub, FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { MicrosoftIcon } from '~/components/icons/Microsoft';
import { DiscordIcon } from '~/components/icons/Discord';
import { GoogleIcon } from '~/components/icons/Google';
import { GitHubIcon } from '~/components/icons/GitHub';
import { Icon, IconProps } from '@chakra-ui/react';

export function platformButtons(allowedPlatforms: string[]) {
	return [
		{
			name: 'Google',
			color: '#FD9B9B',
			icon: GoogleIcon,
			faIcon: (props: IconProps) => <Icon as={FaGoogle} {...props} />,
			show: allowedPlatforms.includes('google'),
		},
		{
			name: 'Microsoft',
			color: '#7FDCA6',
			icon: MicrosoftIcon,
			faIcon: (props: IconProps) => <Icon as={FaMicrosoft} {...props} />,
			show: allowedPlatforms.includes('microsoft'),
		},
		{
			name: 'GitHub',
			color: '#A7AFBA',
			icon: GitHubIcon,
			faIcon: (props: IconProps) => <Icon as={FaGithub} {...props} />,
			show: allowedPlatforms.includes('github'),
		},
		{
			name: 'Discord',
			color: '#8C96F4',
			icon: DiscordIcon,
			faIcon: (props: IconProps) => <Icon as={FaDiscord} {...props} />,
			show: allowedPlatforms.includes('discord'),
		},
	].filter((button) => button.show);
}

export type PlatformButton = ReturnType<typeof platformButtons>[number];
