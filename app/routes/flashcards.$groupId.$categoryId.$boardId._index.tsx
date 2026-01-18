import { Box, BoxProps, Button, Flex, HStack, IconButton, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Text, Tooltip, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaArrowLeft, FaArrowRight, FaBookOpen, FaCog, FaList, FaRandom } from 'react-icons/fa';
import { ActionFunctionArgs, LinkDescriptor, LoaderFunctionArgs } from '@remix-run/node';
import { useState, useMemo, useCallback, useRef, useEffect, useContext } from 'react';
import { themeColor, themeColorLight, WebReturnType } from '~/other/types';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { IconLinkButton, LinkButton } from '~/components/Button';
import { ConfettiContainer } from '~/components/other/Confetti';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { canEdit, validateParams } from '~/other/utils';
import { TextParser } from '~/components/TextParser';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { useHotkeys } from '~/hooks/useHotkey';
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

	const flashcardData = await api?.flashcards.getDeck({ auth: token, groupId, categoryId, boardId });
	if (!flashcardData || 'error' in flashcardData) throw makeResponse(flashcardData, 'Failed to get flashcard deck.');

	return { deck: flashcardData.data, groupId, categoryId, boardId };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'updateProgress': {
			const currentIndex = parseInt(formData.get('currentIndex') as string);
			const completed = formData.get('completed') === 'true';

			const result = await api?.flashcards.updateProgress({
				auth: token,
				groupId,
				categoryId,
				boardId,
				body: { currentIndex, completed },
			});

			return makeResObject(result, 'Failed to update progress.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Flashcards() {
	const { deck, groupId, categoryId, boardId } = useLoaderData<typeof loader>();
	const colorBg = useColorModeValue(themeColorLight, themeColor);
	const { user } = useContext(RootContext) || {};

	const [hasShownConfetti, setHasShownConfetti] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);

	const [currentIndex, setCurrentIndex] = useState(deck.progress?.currentIndex || 0);
	const [allCards, setAllCards] = useState(deck.cards);

	const pendingProgressRef = useRef<{ currentIndex: number; completed: boolean; } | null>(null);
	const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
	const fetcher = useFetcher<WebReturnType<string>>();

	const [rotation, setRotation] = useState(0);
	const handleFlip = useCallback((isBack = false) => setRotation((r) => r + (isBack ? -180 : 180)), []);

	const submitProgress = useCallback((currentIndex: number, completed: boolean) => {
		pendingProgressRef.current = { currentIndex, completed };
		if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);

		throttleTimerRef.current = setTimeout(() => {
			if (pendingProgressRef.current) {
				const { currentIndex: idx, completed: comp } = pendingProgressRef.current;

				fetcher.submit({
					type: 'updateProgress',
					currentIndex: idx.toString(),
					completed: comp.toString(),
				}, { method: 'post' });

				pendingProgressRef.current = null;
			}
		}, 10000);
	}, [fetcher]);

	useEffect(() => {
		return () => {
			if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);

			if (pendingProgressRef.current) {
				const { currentIndex: idx, completed: comp } = pendingProgressRef.current;

				fetcher.submit({
					type: 'updateProgress',
					currentIndex: idx.toString(),
					completed: comp.toString(),
				}, { method: 'post' });
			}
		};
	}, [fetcher]);

	const currentCard = useMemo(() => allCards[currentIndex] || null, [allCards, currentIndex]);

	const canGoPrevious = useMemo(() => currentIndex > 0, [currentIndex]);
	const canGoNext = useMemo(() => currentIndex < allCards.length - 1, [currentIndex, allCards.length]);

	const handleNext = useCallback(() => {
		if (canGoNext) {
			const newIndex = currentIndex + 1;
			const isCompleted = newIndex === allCards.length - 1;

			setCurrentIndex(newIndex);
			submitProgress(newIndex, isCompleted);

			if (isCompleted && !hasShownConfetti) {
				setShowConfetti(true);
				setHasShownConfetti(true);
			}
		}
	}, [canGoNext, currentIndex, allCards.length, submitProgress, hasShownConfetti]);

	const handleRandom = useCallback(() => {
		if (allCards.length <= 1) return;

		let randomIndex = currentIndex;
		while (randomIndex === currentIndex) {
			randomIndex = Math.floor(Math.random() * allCards.length);
		}

		setCurrentIndex(randomIndex);
		submitProgress(randomIndex, randomIndex === allCards.length - 1);

		if (randomIndex === allCards.length - 1 && !hasShownConfetti) {
			setShowConfetti(true);
			setHasShownConfetti(true);
		}
	}, [currentIndex, allCards.length, submitProgress, hasShownConfetti]);

	const shuffleCards = useCallback(() => {
		const shuffled = [...allCards];

		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
		}

		setAllCards(shuffled);
		setCurrentIndex(0);
		submitProgress(0, false);
	}, [allCards, submitProgress]);

	const handlePrevious = useCallback(() => {
		if (canGoPrevious) {
			const newIndex = currentIndex - 1;

			setCurrentIndex(newIndex);
			submitProgress(newIndex, false);
		}
	}, [canGoPrevious, currentIndex, submitProgress]);

	useEffect(() => {
		setRotation((r) => {
			const multiples = Math.round(r / 360);
			return multiples * 360;
		});
	}, [currentIndex]);

	useHotkeys(['A', 'D', 'W', 'S', 'R', ' '], (k) => {
		switch (k) {
			case 'A': handlePrevious(); break;
			case 'D': handleNext(); break;
			case 'W': handleFlip(); break;
			case 'S': handleFlip(true); break;
			case 'R': handleRandom(); break;
			case ' ': handleFlip(); break;
		}
	});

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1' position='relative' zIndex={1}>
			{showConfetti && <ConfettiContainer amount={100} />}

			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<Flex
					direction={'column'}
					position='relative'
					justify={'center'}
					align={'center'}
					rounded={'lg'}
					zIndex={1}
					id='a3'
				>
					<Box maxWidth='800px' width={{ base: '100%', sm: '90%', md: '80%' }}>
						<Flex
							mb={6}
							gap={4}
							alignItems={'center'}
							justifyContent={'space-between'}
						>
							<Flex direction={'column'}>
								<Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight={'bold'}>
									{deck.board.name}
								</Text>
								<Text fontSize={{ base: 'sm', md: 'md' }} color={'gray.500'}>
									Card {currentIndex + 1} of {allCards.length}
								</Text>
							</Flex>

							<HStack spacing={2}>
								<Tooltip label='Back to Category' placement='bottom' hasArrow>
									<span>
										<IconLinkButton
											to={`/groups/${groupId}/${categoryId}`}
											variant={'ghost'}
											rounded={'full'}
											bg={'alpha100'}
											icon={<FaDeleteLeft />}
											reloadDocument={true}
											aria-label={'Settings'}
											_hover={{ bg: 'alpha300' }}
											isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
										/>
									</span>
								</Tooltip>

								<Tooltip label='View Board' placement='bottom' hasArrow>
									<span>
										<IconLinkButton
											to={`/groups/${groupId}/${categoryId}/${boardId}`}
											variant={'ghost'}
											rounded={'full'}
											bg={'alpha100'}
											icon={<FaBookOpen />}
											reloadDocument={true}
											aria-label={'View Board'}
											_hover={{ bg: 'alpha300' }}
										/>
									</span>
								</Tooltip>

								<Tooltip label='Random Card' placement='bottom' hasArrow>
									<IconButton
										icon={<FaRandom />}
										aria-label={'Random'}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										isDisabled={allCards.length <= 1}
										_hover={{ bg: 'alpha300' }}
										onClick={handleRandom}
									/>
								</Tooltip>

								<Tooltip label='Shuffle Deck' placement='bottom' hasArrow>
									<IconButton
										icon={<GiGloop />}
										aria-label={'Shuffle Deck'}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
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
												variant={'ghost'}
												rounded={'full'}
												bg={'alpha100'}
												icon={<FaCog />}
												aria-label={'Settings'}
												_hover={{ bg: 'alpha300' }}
											/>
										</span>
									</Tooltip>
								)}
							</HStack>
						</Flex>

						{currentCard ? (
							<Flex
								direction={'column'}
								alignItems={'center'}
								w={'100%'}
								gap={6}
							>
								<FlipCard
									onFlip={() => handleFlip()}
									front={currentCard.front}
									back={currentCard.back}
									rotation={rotation}
									key={currentIndex}
								/>

								<Box w={'100%'} position={'relative'}>
									<Slider
										min={0}
										step={1}
										value={currentIndex}
										max={allCards.length - 1}
										aria-label='flashcard-progress'
										focusThumbOnChange={false}
										onChange={(value) => setCurrentIndex(value)}
										onChangeEnd={(value) => {
											submitProgress(value, value === allCards.length - 1);

											if (value === allCards.length - 1 && !hasShownConfetti) {
												setShowConfetti(true);
												setHasShownConfetti(true);
											}
										}}
									>
										<SliderTrack h={'4px'} bg={'alpha300'}>
											<SliderFilledTrack bg={themeColor} />
										</SliderTrack>

										<SliderThumb boxSize={3} />
									</Slider>
								</Box>

								<Flex
									gap={4}
									w={'100%'}
									alignItems={'center'}
									justifyContent={'space-between'}
								>
									<Button
										leftIcon={<FaArrowLeft />}
										onClick={handlePrevious}
										isDisabled={!canGoPrevious}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										px={6}
										_hover={{ bg: 'alpha300' }}
										_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									>
										Previous
									</Button>

									{allCards.length > 5 && (
										<LinkButton
											leftIcon={<FaList />}
											to={`/flashcards/${groupId}/${categoryId}/${boardId}/grid`}
											reloadDocument={true}
											variant={'solid'}
											rounded={'full'}
											bg={colorBg}
											px={6}
										>
											View All Cards
										</LinkButton>
									)}

									<Button
										rightIcon={<FaArrowRight />}
										onClick={handleNext}
										isDisabled={!canGoNext}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										px={6}
										_hover={{ bg: 'alpha300' }}
										_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									>
										Next
									</Button>
								</Flex>
							</Flex>
						) : (
							<Flex
								p={4}
								w={'100%'}
								rounded={'lg'}
								bg={'alpha100'}
								alignItems={'center'}
								transition={'all 0.3s ease'}
								justifyContent={'center'}
								minH={'300px'}
							>
								<Text fontSize={'2xl'} fontWeight={'bold'}>
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

export type FlipCardProps = {
	front: string;
	back: string;

	rotation: number;
	onFlip: () => void;

	colorAnswer?: boolean;
} & BoxProps

export function FlipCard({ front, back, rotation, onFlip, ...props }: FlipCardProps) {
	return (
		<Box sx={{ perspective: '1500px' }} w='100%'>
			<Box
				w='100%'
				rounded='lg'
				cursor='pointer'
				userSelect='none'
				minH='fit-content'
				position='relative'
				transition='transform 0.6s ease'
				h={{ base: '300px', md: '400px' }}
				onClick={onFlip}
				{...props}
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
					p={8}
					sx={{
						backfaceVisibility: 'hidden',
						transform: 'rotateX(0deg)',
					}}
				>
					<Text
						fontSize={{ base: 'xl', md: '2xl' }}
						wordBreak='break-word'
						fontWeight='semibold'
						textAlign='center'
					>
						<TextParser>{front}</TextParser>
					</Text>
				</Box>

				<Box
					position='absolute'
					inset='0'
					borderRadius='lg'
					bg='alpha100'
					display='flex'
					alignItems='center'
					justifyContent='center'
					boxShadow='xl'
					p={8}
					sx={{
						backfaceVisibility: 'hidden',
						transform: 'rotateX(180deg)',
					}}
				>
					<Text
						fontSize={{ base: 'xl', md: '2xl' }}
						wordBreak='break-word'
						fontWeight='semibold'
						textAlign='center'
					>
						<TextParser>{back}</TextParser>
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
