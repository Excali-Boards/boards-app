import { Box, Button, Flex, HStack, IconButton, Slider, SliderFilledTrack, SliderThumb, SliderTrack, Text, VStack } from '@chakra-ui/react';
import { FaArrowLeft, FaArrowRight, FaBookOpen, FaCog, FaRandom } from 'react-icons/fa';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { ConfettiContainer } from '~/components/other/Confetti';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { themeColor, WebReturnType } from '~/other/types';
import { canEdit, validateParams } from '~/other/utils';
import { IconLinkButton } from '~/components/Button';
import { authenticator } from '~/utils/auth.server';
import { useHotkeys } from '~/hooks/useHotkey';
import { FaDeleteLeft } from 'react-icons/fa6';
import { api } from '~/utils/web.server';

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

	const [hasShownConfetti, setHasShownConfetti] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);

	const [currentIndex, setCurrentIndex] = useState(deck.progress?.currentIndex || 0);

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

	const currentCard = useMemo(() => deck.cards[currentIndex] || null, [deck.cards, currentIndex]);

	const canGoPrevious = useMemo(() => currentIndex > 0, [currentIndex]);
	const canGoNext = useMemo(() => currentIndex < deck.cards.length - 1, [currentIndex, deck.cards.length]);

	const handleNext = useCallback(() => {
		if (canGoNext) {
			const newIndex = currentIndex + 1;
			const isCompleted = newIndex === deck.cards.length - 1;

			setCurrentIndex(newIndex);
			submitProgress(newIndex, isCompleted);

			if (isCompleted && !hasShownConfetti) {
				setShowConfetti(true);
				setHasShownConfetti(true);
			}
		}
	}, [canGoNext, currentIndex, deck.cards.length, submitProgress, hasShownConfetti]);

	const handleRandom = useCallback(() => {
		if (deck.cards.length <= 1) return;

		let randomIndex = currentIndex;
		while (randomIndex === currentIndex) {
			randomIndex = Math.floor(Math.random() * deck.cards.length);
		}

		setCurrentIndex(randomIndex);
		submitProgress(randomIndex, randomIndex === deck.cards.length - 1);

		if (randomIndex === deck.cards.length - 1 && !hasShownConfetti) {
			setShowConfetti(true);
			setHasShownConfetti(true);
		}
	}, [currentIndex, deck.cards.length, submitProgress, hasShownConfetti]);

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

	useHotkeys(['A', 'D', 'W', 'S', ' '], (k) => {
		switch (k) {
			case 'A': handlePrevious(); break;
			case 'D': handleNext(); break;
			case 'W': handleFlip(); break;
			case 'S': handleFlip(true); break;
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
									Card {currentIndex + 1} of {deck.cards.length}
								</Text>
							</Flex>

							<HStack spacing={2}>
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

								<IconButton
									icon={<FaRandom />}
									aria-label={'Random'}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									isDisabled={deck.cards.length <= 1}
									_hover={{ bg: 'alpha300' }}
									onClick={handleRandom}
								/>

								{canEdit(deck.board.accessLevel) && (
									<IconLinkButton
										to={`/flashcards/${groupId}/${categoryId}/${boardId}/manage`}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										icon={<FaCog />}
										aria-label={'Settings'}
										_hover={{ bg: 'alpha300' }}
									/>
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
										max={deck.cards.length - 1}
										aria-label='flashcard-progress'
										focusThumbOnChange={false}
										onChange={(value) => setCurrentIndex(value)}
										onChangeEnd={(value) => {
											submitProgress(value, value === deck.cards.length - 1);

											if (value === deck.cards.length - 1 && !hasShownConfetti) {
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
};

export function FlipCard({ front, back, rotation, onFlip }: FlipCardProps) {
	return (
		<Box sx={{ perspective: '1500px' }} w='100%'>
			<Box
				w='100%'
				rounded='lg'
				cursor='pointer'
				userSelect='none'
				position='relative'
				transition='transform 0.6s ease'
				h={{ base: '300px', md: '400px' }}
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
						{front}
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
						{back}
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
