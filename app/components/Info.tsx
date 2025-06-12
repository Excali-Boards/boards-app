import { Text, Button, Flex, Divider } from '@chakra-ui/react';
import { LinkButton } from '~/components/Button';
import { Fragment } from 'react/jsx-runtime';

export type InfoComponentProps = {
	title?: string;
	text?: string;
	display?: boolean;
	button?: {
		text?: string;
		isLink?: boolean;
		redirectUrl?: string;
		colorScheme?: string;
	} | null;
};

export default function InfoComponent({ title, text, button, display = true }: InfoComponentProps) {
	return (
		<Flex
			display={display ? 'flex' : 'none'}
			alignItems={'center'}
			justifyContent={{ base: 'center', md: 'space-between' }}
			flexDir={{ base: 'column', md: 'row' }}
			bg={'alpha100'}
			py={4}
			px={8}
			borderRadius={8}
			gap={{ base: 4, md: 8 }}
			maxW={'3xl'}
		>
			<Flex
				alignItems={{ base: 'center', md: 'start' }}
				textAlign={{ base: 'center', md: 'start' }}
				justifyContent={'center'}
				flexDir={'column'}
			>
				<Text fontSize={'2xl'} fontWeight={'bold'}>{title || '404 | Not Found.'}</Text>
				<Text fontSize={'lg'}>{text || 'Are you sure you\'re in the right place?'}</Text>
			</Flex>

			{button !== null && (
				<Fragment>
					<Divider orientation={'vertical'} color={'red'} height={'50px'} display={{ base: 'none', md: 'block' }} />

					{button?.isLink ? (
						<LinkButton
							minW={'100px'}
							to={button.redirectUrl || '/'}
							colorScheme={button.colorScheme || 'red'}
						>
							{button.text || 'Back'}
						</LinkButton>
					) : (
						<Button
							id={'info-button'}
							minW={'100px'}
							colorScheme={button?.colorScheme || 'red'}
							onClick={() => button?.redirectUrl ? window.location.assign(button.redirectUrl) : window.history.back()}
						>
							{button?.text || 'Back'}
						</Button>
					)}
				</Fragment>
			)}
		</Flex>
	);
}
