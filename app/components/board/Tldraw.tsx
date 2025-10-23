import { AssetRecordType, Editor, getHashForString, TLAssetStore, TLBookmarkAsset, TLRecord } from 'tldraw';
import { TLPersistentClientSocket, TLSocketStatusChangeEvent, useSync } from '@tldraw/sync';
import { ClientToServerEvents, ServerToClientEvents } from '~/other/types';
import { useCallback, useMemo, useEffect, useState } from 'react';
import msgPack from 'socket.io-msgpack-parser';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '~/other/apiClient';
import { TopBar } from '~/components/TopBar';
import { Box, Flex } from '@chakra-ui/react';
import { BoardProps } from './types';
import { Tldraw } from './Imports';
// eslint-disable-next-line import/no-unresolved
import 'tldraw/tldraw.css';

export function TldrawBoard(props: BoardProps) {
	const { boardId, token, socketUrl, canEdit, user } = props;
	const [editor, setEditor] = useState<Editor | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [isFirstTime, setIsFirstTime] = useState(true);
	const [isKicked, setIsKicked] = useState(false);

	const connectFunction = useCallback(() => {
		const ioSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
			auth: { token: token, room: boardId },
			parser: msgPack,
		});

		ioSocket.on('connect', () => {
			console.log('Socket.IO connected to server.');
			setIsConnected(true);
			setIsFirstTime(false);
		});

		ioSocket.on('disconnect', (reason) => {
			console.log('Socket.IO disconnected:', reason);
			setIsConnected(false);
		});

		ioSocket.on('connect_error', (error) => {
			console.error('Socket.IO connection error:', error);
			setIsConnected(false);
		});

		ioSocket.on('kick', () => {
			setIsKicked(true);
		});

		return socketIoToTldrawSocket(ioSocket);
	}, [boardId, token, socketUrl]);

	const store = useSync({
		connect: connectFunction,
		assets: useMemo(() => getMultiplayerAssets({ boardId, token, socketUrl }), [boardId, token, socketUrl]),
		userInfo: {
			id: user.userId,
			name: user.displayName,
		},
	});

	const triggerColorUpdate = useCallback(() => {
		if (!editor) return;

		const colorScheme = props.useOppositeColorForBoard
			? (props.colorMode === 'light' ? 'dark' : 'light')
			: props.colorMode;

		editor.user.updateUserPreferences({ colorScheme });

		setTimeout(() => {
			editor.updateInstanceState({
				isDebugMode: editor.getInstanceState().isDebugMode,
			});
		}, 100);
	}, [props.colorMode, props.useOppositeColorForBoard, editor]);

	useEffect(() => {
		triggerColorUpdate();
	}, [triggerColorUpdate]);

	useEffect(() => {
		if (editor) triggerColorUpdate();
	}, [editor, triggerColorUpdate]);

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
				filter={isKicked ? 'blur(15px)' : 'none'}
				display={isConnected || (!isConnected && !isFirstTime) ? 'block' : 'none'}
				pointerEvents={!isConnected || (!isConnected && !isFirstTime) || isKicked ? 'none' : 'auto'}
			>
				<Tldraw
					store={store}
					hideUi={!canEdit}
					onMount={(editor) => {
						setEditor(editor);

						const colorScheme = props.useOppositeColorForBoard
							? (props.colorMode === 'light' ? 'dark' : 'light')
							: props.colorMode;

						editor.user.updateUserPreferences({ colorScheme });

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

function socketIoToTldrawSocket(ioSocket: Socket<ServerToClientEvents, ClientToServerEvents>): TLPersistentClientSocket<TLRecord> {
	const statusChangeListeners = new Set<(event: TLSocketStatusChangeEvent) => void>();

	let messageQueue: string[] = [];
	let serverInitialized = false;

	const tldrawSocket: TLPersistentClientSocket<TLRecord> = {
		connectionStatus: 'offline',

		sendMessage: (message) => {
			const messageString = JSON.stringify(message);

			if (!serverInitialized) messageQueue.push(messageString);
			else ioSocket.emit('tldraw', messageString);
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
			console.log('Restarting Socket.IO connection..');
			ioSocket.disconnect();
			ioSocket.connect();
		},

		close: () => {
			ioSocket.off('connect', connectHandler);
			ioSocket.off('disconnect', disconnectHandler);
			ioSocket.off('connect_error', errorHandler);
			ioSocket.off('init');
			clearTimeout(initialStatusTimeout);
			ioSocket.disconnect();
		},
	};

	const connectHandler = () => {
		tldrawSocket.connectionStatus = 'online';
		statusChangeListeners.forEach((cb) => cb({ status: 'online' }));
	};

	const disconnectHandler = () => {
		tldrawSocket.connectionStatus = 'offline';
		statusChangeListeners.forEach((cb) => cb({ status: 'offline' }));
	};

	const errorHandler = (error: Error) => {
		tldrawSocket.connectionStatus = 'error';
		statusChangeListeners.forEach((cb) =>
			cb({
				status: 'error',
				reason: error.message || 'Connection error',
			}),
		);
	};

	ioSocket.on('connect', connectHandler);
	ioSocket.on('disconnect', disconnectHandler);
	ioSocket.on('connect_error', errorHandler);

	ioSocket.on('init', () => {
		console.log('Board Socket.IO server initialized with data.');

		serverInitialized = true;

		if (messageQueue.length > 0) {
			console.log(`Flushing ${messageQueue.length} queued messages`);
			messageQueue.forEach((queuedMessage) => {
				console.log('Sending queued message:', queuedMessage);
				ioSocket.emit('tldraw', queuedMessage);
			});

			messageQueue = [];
		}
	});

	const initialStatusTimeout = setTimeout(() => {
		if (ioSocket.connected) {
			tldrawSocket.connectionStatus = 'online';
			statusChangeListeners.forEach((cb) => cb({ status: 'online' }));
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
