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
			color: '#FC8181',
			icon: GoogleIcon,
			faIcon: (props: IconProps) => <Icon as={FaGoogle} {...props} />,
			show: allowedPlatforms.includes('google'),
		},
		{
			name: 'Microsoft',
			color: '#68D391',
			icon: MicrosoftIcon,
			faIcon: (props: IconProps) => <Icon as={FaMicrosoft} {...props} />,
			show: allowedPlatforms.includes('microsoft'),
		},
		{
			name: 'GitHub',
			color: '#718096',
			icon: GitHubIcon,
			faIcon: (props: IconProps) => <Icon as={FaGithub} {...props} />,
			show: allowedPlatforms.includes('github'),
		},
		{
			name: 'Discord',
			color: '#6A7BF2',
			icon: DiscordIcon,
			faIcon: (props: IconProps) => <Icon as={FaDiscord} {...props} />,
			show: allowedPlatforms.includes('discord'),
		},
	].filter((button) => button.show);
}

export type PlatformButton = ReturnType<typeof platformButtons>[number];
