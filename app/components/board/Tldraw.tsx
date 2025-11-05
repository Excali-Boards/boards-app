import { AssetRecordType, Editor, getHashForString, TLAssetStore, TLBookmarkAsset, TLRecord, TLUserPreferences, useTldrawUser } from 'tldraw';
import { TLPersistentClientSocket, TLSocketStatusChangeEvent, useSync } from '@tldraw/sync';
import { ClientToServerEvents, ServerToClientEvents } from '~/other/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import msgPack from 'socket.io-msgpack-parser';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '~/other/apiClient';
import { TopBar } from '~/components/TopBar';
import { Box, Flex } from '@chakra-ui/react';
import { TldrawBoardProps } from './types';
import { Tldraw } from './Imports';
import 'tldraw/tldraw.css';

export function TldrawBoard(props: TldrawBoardProps) {
	const { boardId, token, socketUrl, canEdit, user, licenseKey } = props;
	const [editor, setEditor] = useState<Editor | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [isFirstTime, setIsFirstTime] = useState(true);
	const [isKicked, setIsKicked] = useState(false);

	const isVisible = useRef(true);
	const reconnectAttempts = useRef(0);
	const maxReconnectAttempts = 5;

	const colorScheme = useMemo(() => {
		return props.useOppositeColorForBoard
			? (props.colorMode === 'light' ? 'dark' : 'light')
			: props.colorMode;
	}, [props.colorMode, props.useOppositeColorForBoard]);

	const [userPreferences, setUserPreferences] = useState<TLUserPreferences>({
		id: user.userId,
		name: user.displayName,
		colorScheme: colorScheme,
	});

	useEffect(() => {
		const handleVisibilityChange = () => {
			isVisible.current = !document.hidden;

			if (!document.hidden) {
				console.log('Tab became visible, resetting reconnect attempts');
				reconnectAttempts.current = 0;
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, []);

	const connectFunction = useCallback(() => {
		const ioSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
			auth: { token: token, room: boardId },
			parser: msgPack,

			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			reconnectionAttempts: maxReconnectAttempts,
			timeout: 20000,
		});

		ioSocket.on('kick', () => {
			setIsKicked(true);
			ioSocket.disconnect();
		});

		ioSocket.io.on('reconnect_attempt', (attempt) => {
			console.log(`Reconnection attempt ${attempt}`);
			reconnectAttempts.current = attempt;
		});

		ioSocket.io.on('reconnect', (attempt) => {
			console.log(`Reconnected after ${attempt} attempts`);
			reconnectAttempts.current = 0;
		});

		ioSocket.io.on('reconnect_failed', () => {
			console.error('Failed to reconnect after maximum attempts');
		});

		const tldrawSocket = socketIoToTldrawSocket(ioSocket, isVisible);

		tldrawSocket.onStatusChange((event) => {
			switch (event.status) {
				case 'online': {
					console.log('Tldraw socket status: online');
					setIsConnected(true);
					setIsFirstTime(false);
					reconnectAttempts.current = 0;
					break;
				}
				case 'offline': {
					console.log('Tldraw socket status: offline');
					setIsConnected(false);
					break;
				}
				case 'error': {
					console.error('Tldraw socket status: error', event.reason);
					setIsConnected(false);

					if (isVisible.current && reconnectAttempts.current < maxReconnectAttempts) {
						console.log('Attempting to restart connection..');
						setTimeout(() => { tldrawSocket.restart(); }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000));
					}

					break;
				}
			}
		});

		return tldrawSocket;
	}, [boardId, token, socketUrl]);

	const store = useSync({
		connect: connectFunction,
		assets: useMemo(() => getMultiplayerAssets({ boardId, token, socketUrl }), [boardId, token, socketUrl]),
		userInfo: userPreferences,
	});

	const tldrawUser = useTldrawUser({ userPreferences, setUserPreferences });

	const triggerColorUpdate = useCallback(() => {
		if (!editor) return;
		editor.user.updateUserPreferences({ colorScheme });
	}, [editor, colorScheme]);

	useEffect(() => { triggerColorUpdate(); }, [triggerColorUpdate]);

	return (
		<Flex direction={'column'} w={'100%'} h={'100vh'} overflow={'hidden'}>
			{!isConnected && !isFirstTime && !isKicked && (
				<TopBar
					colorScheme={'red'}
					message={'You are currently disconnected from the server, changes will not be saved.'}
				/>
			)}

			{isKicked && (
				<TopBar
					colorScheme={'orange'}
					message={'You have been forcefully disconnected from the board.'}
				/>
			)}

			<Box
				w={'100%'} h={'100%'} overflow={'hidden'}
				filter={isKicked || !isConnected ? 'blur(15px)' : 'none'}
				display={isConnected || (!isConnected && !isFirstTime) ? 'block' : 'none'}
				pointerEvents={!isConnected || (!isConnected && !isFirstTime) || isKicked ? 'none' : 'auto'}
			>
				<Tldraw
					store={store}
					user={tldrawUser}
					licenseKey={licenseKey}
					components={props.hideCollaborators ? {
						Toolbar: null,
					} : undefined}
					onMount={(editor) => {
						setEditor(editor);

						if (!canEdit) editor.setCurrentTool('hand');
						editor.user.updateUserPreferences({ colorScheme });
						editor.updateInstanceState({ isReadonly: !canEdit, isToolLocked: !canEdit });

						editor.registerExternalAssetHandler('url', (asset) => {
							return unfurlBookmarkUrl({
								url: asset.url,
								apiUrl: socketUrl,
								apiAuth: user.email,
							});
						});

						setTimeout(() => {
							triggerColorUpdate();
						}, 50);
					}}
				/>
			</Box>
		</Flex>
	);
}

function socketIoToTldrawSocket(ioSocket: Socket<ServerToClientEvents, ClientToServerEvents>, isVisible: React.MutableRefObject<boolean>): TLPersistentClientSocket<TLRecord> {
	const statusChangeListeners = new Set<(event: TLSocketStatusChangeEvent) => void>();

	let messageQueue: string[] = [];
	let serverInitialized = false;
	let isClosing = false;

	const tldrawSocket: TLPersistentClientSocket<TLRecord> = {
		connectionStatus: 'offline',

		sendMessage: (message) => {
			if (isClosing) return;

			const messageString = JSON.stringify(message);

			if (!serverInitialized) messageQueue.push(messageString);
			else if (ioSocket.connected) ioSocket.emit('tldraw', messageString);
			else messageQueue.push(messageString);
		},

		onReceiveMessage: (callback) => {
			const handler = (message: string) => {
				try {
					const parsedMessage = JSON.parse(message);
					callback(parsedMessage);
				} catch (error) {
					console.error('Failed to parse or process tldraw message:', error, message);
				}
			};

			ioSocket.on('tldraw', handler);

			return () => {
				ioSocket.off('tldraw', handler);
			};
		},

		onStatusChange: (callback) => {
			statusChangeListeners.add(callback);
			return () => {
				statusChangeListeners.delete(callback);
			};
		},

		restart: () => {
			if (!isVisible.current || isClosing) {
				console.log('Skipping restart: tab not visible or socket closing');
				return;
			}

			console.log('Restarting Socket.IO connection...');
			serverInitialized = false;
			messageQueue = [];

			ioSocket.disconnect();

			setTimeout(() => {
				if (!isClosing) ioSocket.connect();
			}, 500);
		},

		close: () => {
			isClosing = true;
			ioSocket.off('connect', connectHandler);
			ioSocket.off('disconnect', disconnectHandler);
			ioSocket.off('connect_error', errorHandler);
			ioSocket.off('init', initHandler);
			clearTimeout(initialStatusTimeout);
			ioSocket.disconnect();
		},
	};

	const connectHandler = () => {
		tldrawSocket.connectionStatus = 'online';
		for (const cb of statusChangeListeners) cb({ status: 'online' });
	};

	const disconnectHandler = (reason: string) => {
		console.log('Socket disconnected:', reason);
		tldrawSocket.connectionStatus = 'offline';
		serverInitialized = false;

		for (const cb of statusChangeListeners) cb({ status: 'offline' });
	};

	const errorHandler = (error: Error) => {
		console.error('Socket connection error:', error);
		tldrawSocket.connectionStatus = 'error';

		for (const cb of statusChangeListeners) cb({
			status: 'error',
			reason: error.message || 'Connection error',
		});
	};

	const initHandler = () => {
		console.log('Board Socket.IO server initialized with data.');
		serverInitialized = true;

		if (messageQueue.length > 0 && ioSocket.connected) {
			console.log(`Flushing ${messageQueue.length} queued messages`);
			const queueToSend = [...messageQueue];
			messageQueue = [];

			for (const queuedMessage of queueToSend) {
				ioSocket.emit('tldraw', queuedMessage);
			}
		}
	};

	ioSocket.on('connect', connectHandler);
	ioSocket.on('disconnect', disconnectHandler);
	ioSocket.on('connect_error', errorHandler);
	ioSocket.on('init', initHandler);

	const initialStatusTimeout = setTimeout(() => {
		if (ioSocket.connected) {
			tldrawSocket.connectionStatus = 'online';
			for (const cb of statusChangeListeners) cb({ status: 'online' });
		}
	}, 0);

	return tldrawSocket;
}

function getMultiplayerAssets({ boardId, token, socketUrl }: { boardId: string; token: string; socketUrl: string; }): TLAssetStore {
	return {
		async upload(asset, file) {
			console.log('Uploading tldraw asset:', file.name, 'with clientId:', asset.id);
			const result = await apiClient(socketUrl).files.uploadRawFiles({
				auth: token,
				boardId,
				files: [{ file, clientId: asset.id }],
			}).catch(() => null);

			if (!result || 'error' in result) {
				const errorMsg = result && 'error' in result ? String(result.error) : 'Unknown error';
				throw new Error(`Asset upload failed: ${errorMsg}`);
			}

			const fileMapping = result.data.files[0];
			if (!fileMapping?.url) throw new Error('Asset upload failed: No URL returned from server');

			console.log('Successfully uploaded tldraw asset:', fileMapping.serverId, 'URL:', fileMapping.url);
			return { src: fileMapping.url };
		},
		async remove(assetIds) {
			console.log('Removing tldraw assets with IDs:', assetIds);

			const result = await apiClient(socketUrl).files.deleteFiles({
				auth: token,
				boardId,
				fileIds: assetIds,
			}).catch(() => null);

			if (!result || 'error' in result) {
				const errorMsg = result && 'error' in result ? String(result.error) : 'Unknown error';
				throw new Error(`Asset removal failed: ${errorMsg}`);
			}

			console.log('Successfully removed tldraw assets:', assetIds);
		},
		resolve(asset) {
			return asset.props.src;
		},
	};
}

async function unfurlBookmarkUrl({ url, apiUrl, apiAuth }: { url: string; apiUrl: string; apiAuth: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	};

	const response = await apiClient(apiUrl).utils.unfurlUrl({ url, auth: apiAuth }).catch(() => null);
	if (response && !('error' in response)) {
		asset.props.description = response.data?.description ?? '';
		asset.props.image = response.data?.image ?? '';
		asset.props.favicon = response.data?.favicon ?? '';
		asset.props.title = response.data?.title ?? '';
	}

	return asset;
}
