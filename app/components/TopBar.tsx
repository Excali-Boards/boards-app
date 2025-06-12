import { Flex, IconButton, Text, Tooltip } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { TiWarning } from 'react-icons/ti';
import { MdClose } from 'react-icons/md';

export type TopBarProps = {
	message: string;
	colorScheme: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'cyan' | 'teal' | 'pink' | 'orange' | 'gray';
	dismissable?: boolean;
	uniqueId?: string;
};

export function TopBar({
	message,
	colorScheme,
	dismissable = false,
	uniqueId,
}: TopBarProps) {
	const [show, setShow] = useState(false);

	let bg = '';

	switch (colorScheme) {
		case 'red': bg = 'rgba(255, 0, 0, 0.3)'; break;
		case 'yellow': bg = 'rgba(255, 255, 0, 0.3)'; break;
		case 'green': bg = 'rgba(0, 255, 0, 0.3)'; break;
		case 'blue': bg = 'rgba(0, 0, 255, 0.3)'; break;
		case 'purple': bg = 'rgba(128, 0, 128, 0.3)'; break;
		case 'cyan': bg = 'rgba(0, 255, 255, 0.3)'; break;
		case 'teal': bg = 'rgba(0, 128, 128, 0.3)'; break;
		case 'pink': bg = 'rgba(255, 192, 203, 0.3)'; break;
		case 'orange': bg = 'rgba(255, 165, 0, 0.3)'; break;
		case 'gray': bg = 'rgba(128, 128, 128, 0.3)'; break;
	}

	useEffect(() => {
		if (dismissable && uniqueId) setShow(localStorage.getItem(uniqueId) !== 'true');
		else setShow(true);
	}, []); // eslint-disable-line

	return (
		<Flex
			height={8}
			textAlign={'center'}
			alignItems={'center'}
			justifyContent={'center'}
			display={show ? 'flex' : 'none'}
			fontWeight={'bold'}
			position='relative'
			fontSize={'sm'}
			w={'100%'}
			bg={bg}
			py={2}
		>
			<Flex gap={2} alignItems={'center'} position='absolute' left={{ base: 4, md: '50%' }} transform={{ md: 'translateX(-50%)' }}>
				<TiWarning size={20} />
				<Text fontSize={'md'}>{message}</Text>
			</Flex>

			{dismissable && uniqueId && (
				<Tooltip label='Zatvori.' aria-label='Zatvori'>
					<IconButton
						right={4}
						position='absolute'
						aria-label='Zatvori'
						icon={<MdClose size={20} />}
						variant='ghost'
						_hover={{ bg: undefined }}
						_active={{ bg: undefined }}
						onClick={() => {
							localStorage.setItem(uniqueId, 'true');
							setShow(false);
						}}
					/>
				</Tooltip>
			)}
		</Flex>
	);
}
