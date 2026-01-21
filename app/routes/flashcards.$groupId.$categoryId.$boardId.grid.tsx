import { Box, Flex, HStack, IconButton, SimpleGrid, Text, Tooltip, useColorModeValue, VStack } from '@chakra-ui/react';
import { FlipCardProps } from './flashcards.$groupId.$categoryId.$boardId._index';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { LinkDescriptor, LoaderFunctionArgs } from '@remix-run/node';
import { themeColor, themeColorLight } from '~/other/types';
import { useState, useCallback, useContext } from 'react';
import { FaBookOpen, FaCog, FaEye } from 'react-icons/fa';
import { validateParams, canEdit } from '~/other/utils';
import { TextParser } from '~/components/TextParser';
import { IconLinkButton } from '~/components/Button';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { useLoaderData } from '@remix-run/react';
import { FaDeleteLeft } from 'react-icons/fa6';
import { GiGloop } from 'react-icons/gi';
import { api } from '~/utils/web.server';

export const links = (): LinkDescriptor[] => [
	{ rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css' },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBFlashcardData = await api?.flashcards.getDeck({ auth: token, groupId, categoryId, boardId, headers: ipHeaders });
	if (!DBFlashcardData || 'error' in DBFlashcardData) throw makeResponse(DBFlashcardData, 'Failed to get flashcard deck.');

	return { deck: DBFlashcardData.data, groupId, categoryId, boardId };
};

export default function FlashcardsGrid() {
	const { deck, groupId, categoryId, boardId } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const [allCards, setAllCards] = useState(deck.cards);
	const [showingFront, setShowingFront] = useState(true);
	const [rotations, setRotations] = useState<Record<number, number>>({});

	const handleFlip = useCallback((index: number) => {
		setRotations((prev) => ({
			...prev,
			[index]: (prev[index] || 0) + 180,
		}));
	}, []);

	const shuffleCards = useCallback(() => {
		const shuffled = [...allCards];

		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
		}

		setAllCards(shuffled);
		setRotations({});
		setShowingFront(true);
	}, [allCards]);

	const flipAllToFront = useCallback(() => {
		const newRotations: Record<number, number> = {};

		for (let i = 0; i < allCards.length; i++) {
			const current = rotations[i] || 0;
			const normalized = Math.round(current / 360) * 360;
			newRotations[i] = normalized;
		}

		setRotations(newRotations);
		setShowingFront(true);
	}, [allCards, rotations]);

	const flipAllToBack = useCallback(() => {
		const newRotations: Record<number, number> = {};

		for (let i = 0; i < allCards.length; i++) {
			const current = rotations[i] || 0;
			const normalized = Math.round(current / 360) * 360 + 180;
			newRotations[i] = normalized;
		}

		setRotations(newRotations);
		setShowingFront(false);
	}, [allCards, rotations]);

	const flipAll = useCallback(() => {
		if (showingFront) flipAllToBack();
		else flipAllToFront();
	}, [showingFront, flipAllToBack, flipAllToFront]);


	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} position='relative' zIndex={1}>
			<Box maxWidth='1400px' width='100%'>
				<Flex direction='column' position='relative' justify='center' align='center' rounded='lg' zIndex={1}>
					<Box width='100%'>
						<Flex
							mb={6}
							gap={4}
							alignItems='center'
							justifyContent='space-between'
							flexWrap='wrap'
						>
							<Flex direction='column'>
								<Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='bold'>
									{deck.board.name}
								</Text>
								<Text fontSize={{ base: 'sm', md: 'md' }} color='gray.500'>
									{allCards.length} {allCards.length === 1 ? 'Card' : 'Cards'}
								</Text>
							</Flex>

							<HStack spacing={2} flexWrap='wrap'>
								<Tooltip label='Back to Single View' placement='bottom' hasArrow>
									<span>
										<IconLinkButton
											to={`/flashcards/${groupId}/${categoryId}/${boardId}`}
											variant='ghost'
											rounded='full'
											bg='alpha100'
											reloadDocument={true}
											icon={<FaDeleteLeft />}
											aria-label='Back to Single View'
											_hover={{ bg: 'alpha300' }}
										/>
									</span>
								</Tooltip>

								<Tooltip label='View Board' placement='bottom' hasArrow>
									<span>
										<IconLinkButton
											to={`/groups/${groupId}/${categoryId}/${boardId}`}
											variant='ghost'
											rounded='full'
											bg='alpha100'
											icon={<FaBookOpen />}
											reloadDocument={true}
											aria-label='View Board'
											_hover={{ bg: 'alpha300' }}
										/>
									</span>
								</Tooltip>

								<Tooltip label='Flip All Cards' placement='bottom' hasArrow>
									<IconButton
										icon={<FaEye />}
										aria-label='Flip All'
										variant='ghost'
										rounded='full'
										bg='alpha100'
										isDisabled={allCards.length === 0}
										_hover={{ bg: 'alpha300' }}
										onClick={flipAll}
									/>
								</Tooltip>

								<Tooltip label='Shuffle Deck' placement='bottom' hasArrow>
									<IconButton
										icon={<GiGloop />}
										aria-label='Shuffle Deck'
										variant='ghost'
										rounded='full'
										bg='alpha100'
										isDisabled={allCards.length <= 1}
										_hover={{ bg: 'alpha300' }}
										onClick={shuffleCards}
									/>
								</Tooltip>

								{canEdit(deck.board.accessLevel, user?.isDev) && (
									<Tooltip label='Manage Flashcards' placement='bottom' hasArrow>
										<span>
											<IconLinkButton
												to={`/flashcards/${groupId}/${categoryId}/${boardId}/manage`}
												variant='ghost'
												rounded='full'
												bg='alpha100'
												icon={<FaCog />}
												aria-label='Settings'
												_hover={{ bg: 'alpha300' }}
											/>
										</span>
									</Tooltip>
								)}
							</HStack>
						</Flex>

						{allCards.length > 0 ? (
							<SimpleGrid
								columns={{ base: 1, md: 3, lg: 4 }}
								alignItems='stretch'
								spacing={6}
								w='100%'
							>
								{allCards.map((card, index) => (
									<Box key={index} h='100%'>
										<GridFlipCard
											back={card.back}
											front={card.front}
											rotation={rotations[index] || 0}
											onFlip={() => handleFlip(index)}
											colorAnswer={true}
											h='100%'
										/>
									</Box>
								))}
							</SimpleGrid>
						) : (
							<Flex
								p={4}
								w='100%'
								rounded='lg'
								bg='alpha100'
								alignItems='center'
								transition='all 0.3s ease'
								justifyContent='center'
								minH='300px'
							>
								<Text fontSize='2xl' fontWeight='bold'>
									No flashcards available.
								</Text>
							</Flex>
						)}
					</Box>
				</Flex>
			</Box>
		</VStack>
	);
}

export function GridFlipCard({ front, back, rotation, onFlip, colorAnswer, ...props }: FlipCardProps) {
	const colorBg = useColorModeValue(themeColorLight, themeColor);

	return (
		<Box sx={{ perspective: '1500px' }} w='100%' h='100%' {...props}>
			<Box
				w='100%'
				h='100%'
				minH='250px'
				rounded='lg'
				cursor='pointer'
				userSelect='none'
				position='relative'
				transition='transform 0.6s ease'
				onClick={onFlip}
				sx={{
					transformStyle: 'preserve-3d',
					transform: `rotateX(${rotation}deg)`,
				}}
			>
				<Box
					position='absolute'
					inset='0'
					borderRadius='lg'
					bg='alpha100'
					display='flex'
					alignItems='center'
					justifyContent='center'
					boxShadow='xl'
					p={6}
					sx={{
						backfaceVisibility: 'hidden',
						transform: 'rotateX(0deg)',
					}}
				>
					<Text
						fontSize={{ base: 'lg', md: 'xl' }}
						wordBreak='break-word'
						fontWeight='semibold'
						textAlign='center'
						overflow='auto'
						maxH='100%'
					>
						<TextParser>{front}</TextParser>
					</Text>
				</Box>

				<Box
					position='absolute'
					inset='0'
					borderRadius='lg'
					bg={colorAnswer ? colorBg : 'alpha100'}
					display='flex'
					alignItems='center'
					justifyContent='center'
					boxShadow='xl'
					p={6}
					sx={{
						backfaceVisibility: 'hidden',
						transform: 'rotateX(180deg)',
					}}
				>
					<Text
						fontSize={{ base: 'lg', md: 'xl' }}
						wordBreak='break-word'
						fontWeight='semibold'
						textAlign='center'
						overflow='auto'
						maxH='100%'
					>
						<TextParser>{back}</TextParser>
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
