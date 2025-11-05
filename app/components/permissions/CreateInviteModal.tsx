import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, VStack, FormControl, FormLabel, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, useColorMode, useToast, Flex, Text, Box, Divider, useColorModeValue, Icon } from '@chakra-ui/react';
import { GetAllSortedOutput } from '@excali-boards/boards-api-client';
import { getRandomColorScheme, findConflicts } from '~/other/utils';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import Select from '~/components/Select';
import { MdError } from 'react-icons/md';

export type CreateInviteModalProps = {
	isOpen: boolean;
	onClose: () => void;
	allData: GetAllSortedOutput;

	canSelectGroups: boolean;
	canSelectCategories: boolean;
	canSelectBoards: boolean;
};

export const LowerRoles = [
	{ value: 'Viewer', label: 'Viewer (read-only)' },
	{ value: 'Collaborator', label: 'Collaborator (view/edit)' },
];

export const HigherRoles = [
	...LowerRoles,
	{ value: 'Manager', label: 'Manager (create/delete)' },
	{ value: 'Admin', label: 'Admin (users/invites)' },
];

export function CreateInviteModal({ isOpen, onClose, allData, canSelectGroups, canSelectCategories, canSelectBoards }: CreateInviteModalProps) {
	const { colorMode } = useColorMode();

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
	const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
	const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

	const [groupRole, setGroupRole] = useState<string | null>(null);
	const [categoryRole, setCategoryRole] = useState<string | null>(null);
	const [boardRole, setBoardRole] = useState<string | null>(null);

	const [maxUses, setMaxUses] = useState<number>(1);
	const [expiresIn, setExpiresIn] = useState(7);

	useFetcherResponse(fetcher, toast, () => {
		onClose();

		setSelectedGroups([]);
		setSelectedCategories([]);
		setSelectedBoards([]);

		setGroupRole(null);
		setCategoryRole(null);
		setBoardRole(null);

		setMaxUses(1);
		setExpiresIn(7);
	});

	const groupOptions = useMemo(() => allData.map((group) => ({
		value: group.id,
		label: group.name,
		colorScheme: getRandomColorScheme(group.id),
	})), [allData]);

	const categoryOptions = useMemo(() => allData.flatMap((group) => {
		const colorScheme = getRandomColorScheme(group.id);

		return group.categories.map((category) => ({
			value: category.id,
			label: `${group.name} → ${category.name}`,
			colorScheme,
		}));
	}), [allData]);

	const boardOptions = useMemo(() => allData.flatMap((group) =>
		group.categories.flatMap((category) => {
			const colorScheme = getRandomColorScheme(category.id);

			return category.boards.map((board) => ({
				value: board.id,
				label: `${group.name} → ${category.name} → ${board.name}`,
				colorScheme,
			}));
		}),
	), [allData]);

	const handleSubmit = useCallback(() => {
		const inviteData: Record<string, unknown> = {};

		if (selectedGroups.length > 0 && canSelectGroups) {
			inviteData.groupIds = selectedGroups;
			inviteData.groupRole = 'Group' + groupRole;
		}

		if (selectedCategories.length > 0 && canSelectCategories) {
			inviteData.categoryIds = selectedCategories;
			inviteData.categoryRole = 'Category' + categoryRole;
		}

		if (selectedBoards.length > 0 && canSelectBoards) {
			inviteData.boardIds = selectedBoards;
			inviteData.boardRole = 'Board' + boardRole;
		}

		if (maxUses) inviteData.maxUses = maxUses;
		if (expiresIn) inviteData.expiresIn = expiresIn;

		const formData = new FormData();
		formData.append('type', 'createInvite');
		formData.append('inviteData', JSON.stringify(inviteData));
		fetcher.submit(formData, { method: 'post' });
	}, [selectedGroups, selectedCategories, selectedBoards, groupRole, categoryRole, boardRole, maxUses, expiresIn, fetcher, canSelectGroups, canSelectCategories, canSelectBoards]);

	const conflicts = useMemo(() => findConflicts({
		allData,
		selectedGroups, groupRole,
		selectedCategories, categoryRole,
		selectedBoards, boardRole,
	}), [allData, selectedGroups, selectedCategories, selectedBoards, groupRole, categoryRole, boardRole]);

	const isFormValid = useMemo(() => {
		const hasRoles =
			(selectedGroups.length > 0 ? groupRole : true) &&
			(selectedCategories.length > 0 ? categoryRole : true) &&
			(selectedBoards.length > 0 ? boardRole : true);

		const canManage = canSelectBoards || canSelectCategories || canSelectGroups;
		if (!canManage) return false;

		return Boolean(hasRoles) && conflicts.length === 0;
	}, [selectedGroups, selectedCategories, selectedBoards, groupRole, categoryRole, boardRole, conflicts, canSelectBoards, canSelectCategories, canSelectGroups]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered size='xl'>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Create Invite</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={4}>
						{canSelectGroups && (
							<FormControl>
								<FormLabel>Groups</FormLabel>
								<Select
									isMulti
									value={groupOptions.filter((option) => selectedGroups.includes(option.value))}
									onChange={(newValue) => {
										setSelectedGroups(newValue ? newValue.map((item) => item.value) : []);
										if (!newValue || newValue.length === 0) setGroupRole(null);
									}}
									options={groupOptions}
									placeholder='Select groups..'
									noOptionsMessage={() => 'No groups available'}
								/>
							</FormControl>
						)}

						{selectedGroups.length > 0 && canSelectGroups && (
							<FormControl>
								<FormLabel>Group Role</FormLabel>
								<Select
									onChange={(newValue) => setGroupRole(newValue?.value || null)}
									options={HigherRoles}
									placeholder='Select group role..'
								/>
							</FormControl>
						)}

						{canSelectCategories && (
							<FormControl>
								<FormLabel>Categories</FormLabel>
								<Select
									isMulti
									value={categoryOptions.filter((option) => selectedCategories.includes(option.value))}
									onChange={(newValue) => {
										setSelectedCategories(newValue ? newValue.map((item) => item.value) : []);
										if (!newValue || newValue.length === 0) setCategoryRole(null);
									}}
									options={categoryOptions}
									placeholder='Select categories..'
									noOptionsMessage={() => 'No categories available'}
								/>
							</FormControl>
						)}

						{selectedCategories.length > 0 && canSelectCategories && (
							<FormControl>
								<FormLabel>Category Role</FormLabel>
								<Select
									onChange={(newValue) => setCategoryRole(newValue?.value || null)}
									options={HigherRoles}
									placeholder='Select category role..'
								/>
							</FormControl>
						)}

						{canSelectBoards && (
							<FormControl>
								<FormLabel>Boards</FormLabel>
								<Select
									isMulti
									value={boardOptions.filter((option) => selectedBoards.includes(option.value))}
									onChange={(newValue) => {
										setSelectedBoards(newValue ? newValue.map((item) => item.value) : []);
										if (!newValue || newValue.length === 0) setBoardRole(null);
									}}
									options={boardOptions}
									placeholder='Select boards..'
									noOptionsMessage={() => 'No boards available'}
								/>
							</FormControl>
						)}

						{selectedBoards.length > 0 && canSelectBoards && (
							<FormControl>
								<FormLabel>Board Role</FormLabel>
								<Select
									onChange={(newValue) => setBoardRole(newValue?.value || null)}
									options={LowerRoles}
									placeholder='Select board role..'
								/>
							</FormControl>
						)}

						{conflicts.length > 0 && (
							<Fragment>
								<Divider />
								<ConflictsBox conflicts={conflicts} />
								<Divider />
							</Fragment>
						)}

						<Flex w='100%' gap={4} flexDir={{ base: 'column', md: 'row' }}>
							<FormControl flex={1}>
								<FormLabel fontSize='sm' fontWeight='semibold'>
									Maximum uses
								</FormLabel>
								<NumberInput
									value={maxUses || 1}
									onChange={(_, value) => setMaxUses(value)}
									max={100}
									min={1}
									mt={2}
								>
									<NumberInputField placeholder='Max uses' />
									<NumberInputStepper>
										<NumberIncrementStepper />
										<NumberDecrementStepper />
									</NumberInputStepper>
								</NumberInput>
							</FormControl>

							<FormControl flex={1}>
								<FormLabel fontSize='sm' fontWeight='semibold'>
									Expires in (days)
								</FormLabel>
								<NumberInput
									value={expiresIn}
									onChange={(_, num) => setExpiresIn(num)}
									min={1}
									max={30}
								>
									<NumberInputField />
									<NumberInputStepper>
										<NumberIncrementStepper />
										<NumberDecrementStepper />
									</NumberInputStepper>
								</NumberInput>
							</FormControl>
						</Flex>
					</VStack>
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
						colorScheme='blue'
						onClick={handleSubmit}
						isDisabled={!isFormValid}
						isLoading={fetcher.state === 'submitting' || fetcher.state === 'loading'}
					>
						Create Invite
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

export type ConflictsBoxProps = {
	conflicts: { type: 'category' | 'board'; name: string; reason: string }[];
};

export function ConflictsBox({ conflicts }: ConflictsBoxProps) {
	const bg = useColorModeValue('red.50', 'red.900');
	const border = useColorModeValue('red.200', 'red.600');
	const titleColor = useColorModeValue('red.700', 'red.300');
	const textColor = useColorModeValue('red.600', 'red.200');
	const dotColor = useColorModeValue('red.500', 'red.300');

	if (conflicts.length === 0) return null;

	return (
		<Box
			w='100%'
			p={4}
			borderWidth='1px'
			borderRadius='lg'
			bg={bg}
			borderColor={border}
		>
			<VStack align='start' spacing={3}>
				<Flex gap={2} align='center'>
					<Icon as={MdError} boxSize={6} color={titleColor} />

					<Text fontWeight='semibold' color={titleColor}>
						Some of your selections overlap..
					</Text>
				</Flex>

				<VStack align='start' spacing={2} pl={2}>
					{conflicts.map((c, idx) => (
						<Flex key={idx} align='flex-start' gap={2}>
							<Box mt={1.5} boxSize={2} borderRadius='full' bg={dotColor} flexShrink={0} />
							<Text fontSize='sm' color={textColor}>
								<Text as='span' fontWeight='medium'>
									{c.name}
								</Text>{' '}
								— {c.reason}.
							</Text>
						</Flex>
					))}
				</VStack>
			</VStack>
		</Box>
	);
}
