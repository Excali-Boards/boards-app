import { Flex, FlexProps } from '@chakra-ui/react';

export type ContainerProps = {
	children?: React.ReactNode;
};

export function Container({
	children, ...props
}: ContainerProps & FlexProps) {
	return (
		<Flex
			w='100%'
			p={4}
			bg='alpha100'
			borderRadius='md'
			alignItems={'normal'}
			flexDir='column'
			{...props}
		>
			{children}
		</Flex>
	);
}
