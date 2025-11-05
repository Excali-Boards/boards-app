import { Button, Flex, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, NumberInput, NumberInputField, VStack, useColorMode, useToast } from '@chakra-ui/react';
import { Invite } from '@excali-boards/boards-api-client/prisma/generated/client';
import { Jsonify } from '@remix-run/server-runtime/dist/jsonify';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { InviteData } from '@excali-boards/boards-api-client';
import { InviteCard, NoInviteCard } from './InviteCard';
import { Fragment, useCallback, useState } from 'react';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import { QRCodeModal } from '../QRCode';
import Select from '../Select';

export type ResourceInvitesProps = {
	invites: Jsonify<InviteData>[];
	canManage: boolean;
	showRenew?: boolean;
};

export function ResourceInvites({ invites, canManage, showRenew }: ResourceInvitesProps) {
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [targetInvite, setTargetInvite] = useState<Jsonify<InviteData> | null>(null);
	const [targetQRCode, setTargetQRCode] = useState<string | null>(null);

	useFetcherResponse(fetcher, toast);

	const handleDeleteInvite = useCallback((inviteCode: string) => {
		const formData = new FormData();
		formData.append('type', 'deleteInvite');
		formData.append('inviteCode', inviteCode);
		fetcher.submit(formData, { method: 'post' });
	}, [fetcher]);

	const handleRenewInvite = useCallback((inviteCode: string) => {
		const formData = new FormData();
		formData.append('type', 'renewInvite');
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

						onDetails={() => setTargetInvite(invite)}
						onDelete={() => handleDeleteInvite(invite.code)}
						onQrCode={() => setTargetQRCode(`${window.location.origin}/invites/${invite.code}`)}
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
					onRenew={showRenew ? () => {
						handleRenewInvite(targetInvite.code);
						setTargetInvite(null);
					} : undefined}
				/>
			)}

			{targetQRCode && (
				<QRCodeModal
					isOpen={true}
					qrCodeDataUrl={targetQRCode}
					onClose={() => setTargetQRCode(null)}
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
	invite: UpdatedInviteData;

	onClose: () => void;
	onRenew?: () => void;
};

export function ResourceInviteDetailsModal({ invite, isOpen, onClose, onRenew }: ResourceInviteDetailsPropsModal) {
	const { colorMode } = useColorMode();

	const formatExpiresIn = (date: Date) => {
		const now = new Date();
		const diff = date.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);
		const years = Math.floor(days / 365);

		if (years > 0) return `${years} year${years > 1 ? 's' : ''}${months % 12 > 0 ? `, ${months % 12} month${months % 12 > 1 ? 's' : ''}` : ''}${days % 30 > 0 ? `, ${days % 30} day${days % 30 > 1 ? 's' : ''}` : ''}`;
		if (months > 0) return `${months} month${months > 1 ? 's' : ''}${days % 30 > 0 ? `, ${days % 30} day${days % 30 > 1 ? 's' : ''}` : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}`;
		if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}${days % 7 > 0 ? `, ${days % 7} day${days % 7 > 1 ? 's' : ''}` : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}`;
		if (days > 0) return `${days} day${days > 1 ? 's' : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}${minutes % 60 > 0 ? `, ${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}` : ''}`;
		if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}${minutes % 60 > 0 ? `, ${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}` : ''}${seconds % 60 > 0 ? `, ${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}` : ''}`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}${seconds % 60 > 0 ? `, ${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}` : ''}`;
		return `${seconds} second${seconds !== 1 ? 's' : ''}`;
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered size='xl'>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
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
								<Input
									isReadOnly
									value={formatExpiresIn(new Date(invite.expiresAt))}
								/>
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
					{onRenew && (
						<Button
							flex={1}
							colorScheme='blue'
							onClick={onRenew}
						>
							Renew Invite
						</Button>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
