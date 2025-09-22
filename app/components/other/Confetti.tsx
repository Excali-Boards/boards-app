import { Box, keyframes } from '@chakra-ui/react';

const confettiFloat = keyframes`
	0% { transform: translateY(-100vh) rotateZ(0deg); opacity: 1; }
	100% { transform: translateY(100vh) rotateZ(720deg); opacity: 0; }
`;

const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

export function ConfettiPiece({ delay, duration, left }: { delay: number; duration: number; left: number }) {
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
			animation={`${confettiFloat} ${duration}s ease-in ${delay}s infinite`}
			pointerEvents='none'
			zIndex={1000}
		/>
	);
}

export function ConfettiContainer() {
	return (
		<Box position='fixed' top={0} left={0} width='100%' height='100%' pointerEvents='none' overflow='hidden'>
			{Array.from({ length: 50 }, (_, i) => (
				<ConfettiPiece
					key={i}
					delay={Math.random() * 3}
					duration={3 + Math.random() * 2}
					left={Math.random() * 100}
				/>
			))}
		</Box>
	);
}
