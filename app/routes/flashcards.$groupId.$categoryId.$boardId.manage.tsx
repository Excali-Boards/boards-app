import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text, IconButton, Divider, HStack, Tooltip, Textarea } from '@chakra-ui/react';
import { LoaderFunctionArgs, ActionFunctionArgs, redirect, LinkDescriptor } from '@remix-run/node';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { FaPlus, FaTrash, FaPen, FaDownload } from 'react-icons/fa';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { TextParser } from '~/components/TextParser';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { validateParams } from '~/other/utils';
import { WebReturnType } from '~/other/types';
import { FaExplosion } from 'react-icons/fa6';
import Select from '~/components/Select';
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
		case 'updateCard': {
			const cardId = formData.get('cardId') as string;
			const front = formData.get('front') as string;
			const back = formData.get('back') as string;

			if (!cardId || !front || !back) return { status: 400, error: 'Card ID, front and back are required.' };

			const result = await api?.flashcards.updateCards({
				auth: token,
				groupId,
				categoryId,
				boardId,
				body: [{ id: cardId, front, back }],
			});

			return makeResObject(result, 'Failed to update card.');
		}
		case 'deleteCard': {
			const cardId = formData.get('cardId') as string;
			if (!cardId) return { status: 400, error: 'Card ID is required.' };

			const result = await api?.flashcards.deleteCards({ auth: token, groupId, categoryId, boardId, body: [cardId] });
			return makeResObject(result, 'Failed to delete card.');
		}
		case 'createCard': {
			const front = formData.get('front') as string;
			const back = formData.get('back') as string;

			if (!front || !back) return { status: 400, error: 'Front and back are required.' };

			const result = await api?.flashcards.createCards({
				auth: token,
				groupId,
				categoryId,
				boardId,
				body: [{ front, back }],
			});

			return makeResObject(result, 'Failed to create card.');
		}
		case 'import': {
			const importData = formData.get('importData') as string;
			const lineSeparator = formData.get('lineSeparator') as string;
			const answerSeparator = formData.get('answerSeparator') as string;

			if (!importData || !lineSeparator || !answerSeparator) {
				return { status: 400, error: 'Import data and separators are required.' };
			}

			const lines = importData.split(lineSeparator === '\\n' ? '\n' : lineSeparator);
			const cards = lines
				.map(line => line.trim())
				.filter(line => line.length > 0)
				.map(line => {
					const parts = line.split(answerSeparator);
					if (parts.length !== 2) return null;
					return {
						front: parts[0]!.trim(),
						back: parts[1]!.trim(),
					};
				})
				.filter(card => card !== null);

			if (cards.length === 0) {
				return { status: 400, error: 'No valid cards found in import data.' };
			}

			const result = await api?.flashcards.createCards({
				auth: token,
				groupId,
				categoryId,
				boardId,
				body: cards,
			});

			return makeResObject(result, 'Failed to import cards.');
		}
		case 'destroyDeck': {
			const result = await api?.flashcards.destroyDeck({ auth: token, groupId, categoryId, boardId });
			if (!result || 'error' in result) return makeResObject(result, 'Failed to delete deck.');
			return redirect(`/groups/${groupId}/${categoryId}`);
		}
		case 'deleteAll': {
			const cardIds = formData.getAll('cardIds') as string[];
			const result = await api?.flashcards.deleteCards({ auth: token, groupId, categoryId, boardId, body: cardIds });
			return makeResObject(result, 'Failed to delete all cards.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function ManageFlashcards() {
	const { deck } = useLoaderData<typeof loader>();

	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [selectedCard, setSelectedCard] = useState<EditableCard | null>(null);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => {
		setModalOpen(null);
		setSelectedCard(null);
	});

	const handleEdit = useCallback((card: EditableCard) => {
		setSelectedCard(card);
		setModalOpen('editCard');
	}, []);

	const handleDelete = useCallback((card: EditableCard) => {
		setSelectedCard(card);
		setModalOpen('deleteCard');
	}, []);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Flashcards: ${deck.board.name}`}
					description={'Add, edit, or delete flashcards in this deck.'}
					goBackWindow={true}
					customButtons={[{
						type: 'normal',
						label: 'Delete Deck',
						icon: <FaExplosion />,
						onClick: () => setModalOpen('destroyDeck'),
						tooltip: 'Delete entire flashcard deck',
					}, {
						type: 'normal',
						label: 'Delete All Cards',
						icon: <FaTrash />,
						isDisabled: deck.cards.length === 0,
						onClick: () => setModalOpen('deleteAll'),
						tooltip: 'Delete all flashcards',
					}, {
						type: 'normal',
						label: 'Import Cards',
						icon: <FaDownload />,
						onClick: () => setModalOpen('import'),
						tooltip: 'Import flashcards',
					}, {
						type: 'normal',
						label: 'Add Card',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createCard'),
						tooltip: 'Add new flashcard',
					}]}
				/>

				<Divider my={4} />

				<Flex flexDir='column' gap={4} mt={8}>
					{deck.cards.length === 0 ? (
						<Flex
							p={4}
							w='100%'
							rounded='lg'
							bg='alpha100'
							alignItems='center'
							justifyContent='center'
							transition='all 0.3s ease'
						>
							<Text fontSize='2xl' fontWeight='bold'>No flashcards.</Text>
						</Flex>
					) : (
						deck.cards.map((card) => (
							<FlashcardItem
								key={card.id}
								card={card}
								onEdit={() => handleEdit(card)}
								onDelete={() => handleDelete(card)}
							/>
						))
					)}
				</Flex>

				<ManageModal
					fetcher={fetcher}
					isOpen={modalOpen !== null}
					type={modalOpen || 'createCard'}
					allCardIds={deck.cards.map((card) => card.id)}
					selectedCard={selectedCard}
					onClose={() => {
						setModalOpen(null);
						setSelectedCard(null);
					}}
				/>
			</Box>
		</VStack>
	);
}

export type FlashcardItemProps = {
	card: EditableCard;
	onEdit: () => void;
	onDelete: () => void;
};

export function FlashcardItem({ card, onEdit, onDelete }: FlashcardItemProps) {
	return (
		<Flex
			gap={4}
			w='100%'
			py={4}
			px={6}
			rounded='lg'
			height='100%'
			alignItems='center'
			bg='alpha100'
			wordBreak='break-word'
			transition='all 0.3s ease'
			justifyContent='space-between'
			_hover={{ bg: 'alpha200' }}
			flexDirection={{ base: 'column', md: 'row' }}
		>
			<Flex
				justifyContent='center'
				alignItems={{ base: 'center', md: 'start' }}
				textAlign={{ base: 'center', md: 'start' }}
				flexDir='column'
				flexGrow={1}
				gap={2}
			>
				<Box>
					<Text fontSize='sm' fontWeight='semibold' color='gray.500'>Question</Text>
					<Text fontSize='lg'><TextParser>{card.front}</TextParser></Text>
				</Box>
				<Box>
					<Text fontSize='sm' fontWeight='semibold' color='gray.500'>Answer</Text>
					<Text fontSize='lg'><TextParser>{card.back}</TextParser></Text>
				</Box>
			</Flex>

			<Flex
				alignItems='center'
				justifyContent='center'
				flexDir='row'
				gap={4}
			>
				<Divider
					height='100px'
					orientation='vertical'
					display={{ base: 'none', md: 'block' }}
				/>

				<HStack spacing={2}>
					<Tooltip label='Edit' hasArrow>
						<IconButton
							onClick={onEdit}
							variant='ghost'
							rounded='full'
							bg='alpha100'
							icon={<FaPen />}
							aria-label='Edit'
							alignItems='center'
							justifyContent='center'
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					</Tooltip>

					<Tooltip label='Delete' hasArrow>
						<IconButton
							onClick={onDelete}
							variant='ghost'
							rounded='full'
							bg='alpha100'
							icon={<FaTrash />}
							aria-label='Delete'
							alignItems='center'
							justifyContent='center'
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					</Tooltip>
				</HStack>
			</Flex>
		</Flex>
	);
}

export type ModalOpen = 'createCard' | 'editCard' | 'deleteCard' | 'import' | 'deleteAll' | 'destroyDeck' | null;
export type EditableCard = {
	id: string;
	front: string;
	back: string;
};

export type ManageModalProps = {
	isOpen: boolean;
	onClose: () => void;
	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;
	selectedCard: EditableCard | null;
	allCardIds: string[];
};

export function ManageModal({ isOpen, onClose, type, fetcher, selectedCard, allCardIds }: ManageModalProps) {
	const { colorMode } = useColorMode();

	const [front, setFront] = useState('');
	const [back, setBack] = useState('');

	const [answerSeparator, setAnswerSeparator] = useState('|');
	const [lineSeparator, setLineSeparator] = useState('\\n');
	const [importData, setImportData] = useState('');

	const separators = useMemo(() => [
		{ label: 'New Line (\\n)', value: '\\n' },
		{ label: 'Comma (,)', value: ',' },
		{ label: 'Semicolon (;)', value: ';' },
		{ label: 'Pipe (|)', value: '|' },
		{ label: 'Dash (-)', value: '-' },
	], []);

	useEffect(() => {
		if (type === 'editCard' && selectedCard) {
			setFront(selectedCard.front);
			setBack(selectedCard.back);
		} else if (type === 'import') {
			setImportData('');
			setLineSeparator('\\n');
			setAnswerSeparator('-');
		} else {
			setFront('');
			setBack('');
		}
	}, [type, selectedCard]);

	const previewCards = useCallback(() => {
		if (!importData.trim()) return [];

		const lines = importData.split(lineSeparator === '\\n' ? '\n' : lineSeparator);
		return lines
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => {
				const parts = line.split(answerSeparator);
				if (parts.length !== 2) return null;
				return {
					front: parts[0]!.trim(),
					back: parts[1]!.trim(),
				};
			})
			.filter((card) => card !== null)
	}, [importData, lineSeparator, answerSeparator]);

	const parsedPreview = useMemo(() => {
		const cards = previewCards();
		return { total: cards.length, preview: cards.slice(0, 3) };
	}, [previewCards]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method='post'>
					<ModalHeader>
						{type === 'createCard' && 'Create New Card'}
						{type === 'editCard' && 'Edit Card'}
						{type === 'deleteCard' && 'Delete Card'}
						{type === 'import' && 'Import Cards'}
						{type === 'deleteAll' && 'Delete All Cards'}
						{type === 'destroyDeck' && 'Delete Flashcard Deck'}
					</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<Flex flexDir='column' gap={4}>
							{type === 'createCard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='createCard' />
									<Box>
										<Text mb={2} fontWeight='medium'>Question</Text>
										<Textarea
											name='front'
											value={front}
											onChange={(e) => setFront(e.target.value)}
											placeholder='Enter the question'
											autoFocus
											rows={3}
										/>
									</Box>
									<Box>
										<Text mb={2} fontWeight='medium'>Answer</Text>
										<Textarea
											name='back'
											value={back}
											onChange={(e) => setBack(e.target.value)}
											placeholder='Enter the answer'
											rows={3}
										/>
									</Box>
								</>
							)}

							{type === 'editCard' && selectedCard && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='updateCard' />
									<VisuallyHiddenInput onChange={() => { }} name='cardId' value={selectedCard.id} />
									<Box>
										<Text mb={2} fontWeight='medium'>Question</Text>
										<Textarea
											name='front'
											value={front}
											onChange={(e) => setFront(e.target.value)}
											placeholder='Enter the question'
											autoFocus
											rows={3}
										/>
									</Box>
									<Box>
										<Text mb={2} fontWeight='medium'>Answer</Text>
										<Textarea
											name='back'
											value={back}
											onChange={(e) => setBack(e.target.value)}
											placeholder='Enter the answer'
											rows={3}
										/>
									</Box>
								</>
							)}

							{type === 'deleteCard' && selectedCard && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='deleteCard' />
									<VisuallyHiddenInput onChange={() => { }} name='cardId' value={selectedCard.id} />
									<Text>
										Are you sure you want to delete this flashcard? <br /> This action cannot be undone.
									</Text>
									<Box p={4} bg='alpha100' rounded='md'>
										<Text fontSize='sm' fontWeight='semibold' color='gray.500'>Question:</Text>
										<Text mb={2}>{selectedCard.front}</Text>
										<Text fontSize='sm' fontWeight='semibold' color='gray.500'>Answer:</Text>
										<Text>{selectedCard.back}</Text>
									</Box>
								</>
							)}

							{type === 'import' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='import' />
									<Box>
										<Text mb={2} fontWeight='medium'>Paste Your Data</Text>
										<Textarea
											name='importData'
											value={importData}
											onChange={(e) => setImportData(e.target.value)}
											placeholder='Example:\nWhat is 2+2?-4\nWhat is the capital of France?-Paris\nWho wrote Hamlet?-Shakespeare'
											rows={8}
											autoFocus
											fontFamily='monospace'
											fontSize='sm'
										/>
									</Box>

									<Flex gap={4}>
										<Box flex={1}>
											<Text mb={2} fontWeight='medium' fontSize='sm'>Line Separator</Text>
											<Select
												name='lineSeparator'
												value={separators.find((sep) => sep.value === lineSeparator) || null}
												onChange={(e) => e && setLineSeparator(e.value)}
												placeholder='Select line separator'
												options={separators}
												isClearable={false}
											/>
										</Box>

										<Box flex={1}>
											<Text mb={2} fontWeight='medium' fontSize='sm'>Answer Separator</Text>
											<Select
												name='answerSeparator'
												value={separators.find((sep) => sep.value === answerSeparator) || null}
												onChange={(e) => e && setAnswerSeparator(e.value)}
												placeholder='Select answer separator'
												options={separators}
												isClearable={false}
											/>
										</Box>
									</Flex>

									{parsedPreview.total > 0 && (
										<Box p={3} bg='alpha100' rounded='md'>
											<Text fontSize='sm' fontWeight='semibold' mb={2}>
												Preview (first {parsedPreview.preview.length} cards):
											</Text>

											{parsedPreview.preview.map((card, idx) => (
												<Box key={idx} mb={2} pl={2} borderLeft='2px solid' borderColor='blue.400'>
													<Text fontSize='xs' color='gray.500'>Q: {card!.front}</Text>
													<Text fontSize='xs' color='gray.500'>A: {card!.back}</Text>
												</Box>
											))}

											<Text fontSize='xs' color='gray.500' mt={2}>
												Total cards to import: {previewCards().length}
											</Text>
										</Box>
									)}

									{importData.trim() && parsedPreview.total === 0 && (
										<Box p={3} bg='red.100' rounded='md'>
											<Text fontSize='sm' color='red.700'>
												No valid cards found. Make sure your format matches: question{answerSeparator}answer
											</Text>
										</Box>
									)}
								</>
							)}

							{type === 'deleteAll' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='deleteAll' />
									{allCardIds.map((id) => <VisuallyHiddenInput key={id} onChange={() => { }} name='cardIds' value={id} />)}

									<Text>
										Are you sure you want to delete all flashcards? <br /> This action cannot be undone.
									</Text>
								</>
							)}

							{type === 'destroyDeck' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='destroyDeck' />

									<Text>
										Are you sure you want to delete the entire flashcard deck? <br /> This action cannot be undone and all flashcards will be lost.
									</Text>
								</>
							)}
						</Flex>
					</ModalBody>
					<ModalFooter display='flex' gap={1}>
						<Button
							flex={1}
							colorScheme='gray'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							flex={1}
							type='submit'
							colorScheme={type === 'deleteCard' || type === 'deleteAll' || type === 'destroyDeck' ? 'red' : 'blue'}
							isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
							isDisabled={
								((type === 'createCard' || type === 'editCard') && (!front.trim() || !back.trim())) ||
								(type === 'import' && parsedPreview.total === 0)
							}
						>
							{type === 'createCard' && 'Create Card'}
							{type === 'editCard' && 'Save Changes'}
							{type === 'deleteCard' && 'Delete Card'}
							{type === 'import' && `Import ${parsedPreview.total} Cards`}
							{type === 'deleteAll' && 'Delete All'}
							{type === 'destroyDeck' && 'Delete Deck'}
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}
