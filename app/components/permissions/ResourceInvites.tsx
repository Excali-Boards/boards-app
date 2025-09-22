import { Button, Flex, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, NumberInput, NumberInputField, VStack, useColorMode, useToast } from '@chakra-ui/react';
import { Invite } from '@excali-boards/boards-api-client/prisma/generated/client';
import { Jsonify } from '@remix-run/server-runtime/dist/jsonify';
import { InviteData } from '@excali-boards/boards-api-client';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { InviteCard, NoInviteCard } from './InviteCard';
import { Fragment, useCallback, useState } from 'react';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import Select from '../Select';

export type ResourceInvitesProps = {
	invites: Jsonify<InviteData>[];
	canManage: boolean;
};

export function ResourceInvites({ invites, canManage }: ResourceInvitesProps) {
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [targetInvite, setTargetInvite] = useState<Jsonify<InviteData> | null>(null);

	useFetcherResponse(fetcher, toast);

	const handleDeleteInvite = useCallback((inviteCode: string) => {
		const formData = new FormData();
		formData.append('type', 'deleteInvite');
		formData.append('inviteCode', inviteCode);
		fetcher.submit(formData, { method: 'post' });
	}, [fetcher]);

	const mappedData = useCallback((data: Jsonify<InviteData>) => {
		return {
			...data,
			groups: data.groups.map((g) => ({ value: g.groupId, label: g.name })),
			categories: data.categories.map((c) => ({ value: c.categoryId, label: c.name })),
			boards: data.boards.map((b) => ({ value: b.boardId, label: b.name })),
		};
	}, []);

	return (
		<Fragment>
			<VStack w='100%' spacing={2}>
				{invites.length ? invites.map((invite, i) => (
					<InviteCard
						key={invite.code + '|' + i}
						id={invite.code}
						code={invite.code}
						role={invite.groupRole || invite.categoryRole || invite.boardRole || 'viewer'}
						uses={invite.currentUses}
						maxUses={invite.maxUses || 0}
						expiresAt={invite.expiresAt ? new Date(invite.expiresAt) : null}
						canManage={canManage}
						onDelete={() => handleDeleteInvite(invite.code)}
						onDetails={() => setTargetInvite(invite)}
					/>
				)) : (
					<NoInviteCard noWhat='active invites' />
				)}
			</VStack>

			{targetInvite && (
				<ResourceInviteDetailsModal
					isOpen={true}
					invite={mappedData(targetInvite)}
					onClose={() => setTargetInvite(null)}
				/>
			)}
		</Fragment>
	);
}

export type UpdatedInviteData = Jsonify<Pick<Invite, 'code' | 'expiresAt' | 'maxUses' | 'currentUses' | 'boardRole' | 'categoryRole' | 'groupRole'>> & {
	groups: { value: string; label: string; }[];
	categories: { value: string; label: string; }[];
	boards: { value: string; label: string; }[];
};

export type ResourceInviteDetailsPropsModal = {
	isOpen: boolean;
	onClose: () => void;
	invite: UpdatedInviteData;
};

export function ResourceInviteDetailsModal({ invite, isOpen, onClose }: ResourceInviteDetailsPropsModal) {
	const { colorMode } = useColorMode();

	const getExpiresIn = useCallback((date: Date | string | null) => {
		if (!date) return 'Never';
		if (typeof date === 'string') date = new Date(date);

		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

		if (diffMs <= 0) return 'Expired';
		if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}${diffHours > 0 ? `, ${diffHours} hour${diffHours > 1 ? 's' : ''}` : ''}`;
		if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}${diffMinutes > 0 ? `, ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : ''}`;
		if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
		return 'less than a minute';
	}, []);

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered size='3xl'>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'dark' ? 'brand900' : 'white'} mx={2}>
				<ModalHeader>Invite Details</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={4}>
						{invite.groups.length > 0 && (
							<FormControl>
								<FormLabel>Groups</FormLabel>
								<Select
									isMulti
									isReadOnly
									value={invite.groups}
									options={invite.groups}
									placeholder='Select groups..'
									noOptionsMessage={() => 'No groups available'}
								/>
							</FormControl>
						)}

						{invite.groups.length > 0 && invite.groupRole && (
							<FormControl>
								<FormLabel>Group Role</FormLabel>
								<Input
									isReadOnly
									value={invite.groupRole}
									placeholder='Select group role..'
								/>
							</FormControl>
						)}

						{invite.categories.length > 0 && (
							<FormControl>
								<FormLabel>Categories</FormLabel>
								<Select
									isMulti
									isReadOnly
									value={invite.categories}
									options={invite.categories}
									placeholder='Select categories..'
									noOptionsMessage={() => 'No categories available'}
								/>
							</FormControl>
						)}

						{invite.categories.length > 0 && invite.categoryRole && (
							<FormControl>
								<FormLabel>Category Role</FormLabel>
								<Input
									isReadOnly
									value={invite.categoryRole}
									placeholder='Select category role..'
								/>
							</FormControl>
						)}

						{invite.boards.length > 0 && (
							<FormControl>
								<FormLabel>Boards</FormLabel>
								<Select
									isMulti
									isReadOnly
									value={invite.boards}
									options={invite.boards}
									placeholder='Select boards..'
									noOptionsMessage={() => 'No boards available'}
								/>
							</FormControl>
						)}

						{invite.boards.length > 0 && invite.boardRole && (
							<FormControl>
								<FormLabel>Board Role</FormLabel>
								<Input
									isReadOnly
									value={invite.boardRole}
									placeholder='Select board role..'
								/>
							</FormControl>
						)}

						<Flex w='100%' gap={4} flexDir={{ base: 'column', md: 'row' }}>
							<FormControl w='25%'>
								<FormLabel fontSize='sm' fontWeight='semibold'>
									Maximum uses
								</FormLabel>
								<NumberInput
									isReadOnly
									value={invite.maxUses || 1}
									mt={2}
								>
									<NumberInputField />
								</NumberInput>
							</FormControl>

							<FormControl w='25%'>
								<FormLabel fontSize='sm' fontWeight='semibold'>
									Current uses
								</FormLabel>
								<NumberInput
									isReadOnly
									value={invite.currentUses}
									mt={2}
								>
									<NumberInputField />
								</NumberInput>
							</FormControl>

							<FormControl w='50%'>
								<FormLabel fontSize='sm' fontWeight='semibold'>
									Expires in
								</FormLabel>
								<NumberInput isReadOnly value={getExpiresIn(invite.expiresAt)}>
									<NumberInputField />
								</NumberInput>
							</FormControl>
						</Flex>
					</VStack>
				</ModalBody>
				<ModalFooter display={'flex'} gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
					>
						Close
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
