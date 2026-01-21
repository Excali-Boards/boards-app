import { getIpHeaders, makeResponse, makeResObject } from '~/utils/functions.server';
import { SessionCard, NoSessionCard } from '~/components/sessions/SessionCard';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { VStack, Box, Divider, useToast } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ConfirmModal } from '~/components/other/ConfirmModal';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { FaKey, FaTrash } from 'react-icons/fa';
import { WebReturnType } from '~/other/types';
import { useCallback, useState } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBSessions = await api?.sessions.getAllSessions({ auth: token, headers: ipHeaders });
	if (!DBSessions || 'error' in DBSessions) throw makeResponse(DBSessions, 'Failed to get sessions.');

	return {
		currentSessionToken: token,
		...DBSessions.data,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return makeResObject(null, 'Failed to get client IP.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'deleteSession': {
			const sessionId = formData.get('sessionId') as string;
			if (!sessionId) return { status: 400, error: 'Invalid request.' };

			const result = await api?.sessions.deleteSession({ auth: token, dbId: sessionId, headers: ipHeaders });
			const isCurrent = formData.get('isCurrent') === 'true';

			if (result?.status === 200 && isCurrent) return authenticator.logout(request, { redirectTo: '/' });
			else return makeResObject(result, 'Failed to delete session.');
		}
		case 'deleteAllSessions': {
			const result = await api?.sessions.deleteAllSessions({ auth: token, headers: ipHeaders });

			if (result?.status === 200) return authenticator.logout(request, { redirectTo: '/' });
			else return makeResObject(result, 'Failed to delete all sessions.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Sessions() {
	const { sessions, activeDbId, currentSessionToken } = useLoaderData<typeof loader>();
	const [confirmModal, setConfirmModal] = useState<{ type: 'single' | 'all'; token?: string; } | null>(null);
	const toast = useToast();

	const fetcher = useFetcher<WebReturnType<string>>();
	useFetcherResponse(fetcher, toast, () => setConfirmModal(null));

	const handleDeleteSession = useCallback((id: string) => {
		fetcher.submit({ type: 'deleteSession', sessionId: id, isCurrent: id === activeDbId }, { method: 'post' });
		setConfirmModal(null);
	}, [activeDbId, fetcher]);

	const handleDeleteAllSessions = useCallback(() => {
		fetcher.submit({ type: 'deleteAllSessions' }, { method: 'post' });
		setConfirmModal(null);
	}, [fetcher]);

	const copyCurrentSessionToken = useCallback(() => {
		navigator.clipboard.writeText(currentSessionToken).then(() => {
			toast({
				title: 'Session Token Copied',
				status: 'success',
				duration: 3000,
				isClosable: true,
			});
		}).catch(() => {
			toast({
				title: 'Failed to Copy Session Token',
				status: 'error',
				duration: 3000,
				isClosable: true,
			});
		});
	}, [currentSessionToken, toast]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Active Sessions'}
					description='Manage your active login sessions across all devices.'
					goBackPath='/profile'
					customButtons={sessions.length > 0 ? [{
						type: 'normal',
						onClick: () => setConfirmModal({ type: 'all' }),
						icon: <FaTrash />,
						label: 'Delete All',
						tooltip: 'Delete all sessions',
					}, {
						type: 'normal',
						onClick: copyCurrentSessionToken,
						icon: <FaKey />,
						label: 'Copy Current Session Token',
						tooltip: 'Copy current session token to clipboard',
					}] : []}
				/>

				<Divider my={4} />

				<VStack spacing={3} w='100%'>
					{sessions.length ? (
						sessions.map((session) => (
							<SessionCard
								key={session.tokenPreview}
								tokenPreview={session.tokenPreview}
								expiresAt={session.expiresAt}
								location={session.location}
								createdAt={session.createdAt}
								lastUsed={session.lastUsed}
								device={session.device}
								isCurrent={session.dbId === activeDbId}
								onDelete={() => setConfirmModal({ type: 'single', token: session.dbId })}
							/>
						))
					) : (
						<NoSessionCard noWhat='active sessions' />
					)}
				</VStack>
			</Box>

			<ConfirmModal
				isOpen={confirmModal?.type === 'single'}
				onClose={() => setConfirmModal(null)}
				onConfirm={() => confirmModal?.token && handleDeleteSession(confirmModal.token)}
				title='Delete Session'
				message={'Are you sure you want to delete this session?\nYou will be logged out of this device.'}
				isLoading={fetcher.state === 'submitting'}
				confirmText='Delete Session'
				colorScheme='red'
			/>

			<ConfirmModal
				isOpen={confirmModal?.type === 'all'}
				onClose={() => setConfirmModal(null)}
				onConfirm={handleDeleteAllSessions}
				title='Delete All Sessions'
				message={'Are you sure you want to delete all sessions?\nYou will be logged out of all devices except this one.'}
				isLoading={fetcher.state === 'submitting'}
				confirmText='Delete All Sessions'
				colorScheme='red'
			/>
		</VStack>
	);
}
