import { Box, keyframes } from '@chakra-ui/react';

const confettiFloat = keyframes`
	0% { transform: translateY(-100vh) rotateZ(0deg); opacity: 1; }
	100% { transform: translateY(100vh) rotateZ(720deg); opacity: 0; }
`;

const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

export type ConfettiPieceProps = {
	left: number;
	delay: number;
	duration: number;
	animation?: 'infinite' | 'forwards';
};

export function ConfettiPiece({ delay, duration, left, animation }: ConfettiPieceProps) {
	const randomColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];

	return (
		<Box
			position='absolute'
			width='10px'
			height='10px'
			backgroundColor={randomColor}
			left={`${left}%`}
			top='-10px'
			borderRadius='2px'
			animation={`${confettiFloat} ${duration}s ease-in ${delay}s ${animation || 'forwards'}`}
			pointerEvents='none'
			zIndex={1000}
		/>
	);
}

export type ConfettiContainerProps = {
	amount?: number;
	animation?: 'infinite' | 'forwards';
	startDelay?: number;
};

export function ConfettiContainer({ amount = 50, animation, startDelay = 0 }: ConfettiContainerProps) {
	return (
		<Box position='fixed' top={0} left={0} width='100%' height='100%' pointerEvents='none' overflow='hidden'>
			{Array.from({ length: amount }, (_, i) => (
				<ConfettiPiece
					key={i}
					animation={animation}
					delay={startDelay + Math.random() * 10}
					duration={3 + Math.random() * 2}
					left={Math.random() * 100}
				/>
			))}
		</Box>
	);
}
