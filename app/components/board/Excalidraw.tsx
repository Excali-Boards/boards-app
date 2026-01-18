import { Excalidraw, getSceneVersion, getVisibleSceneBounds, isSyncableElement, newElementWith, reconcileElements, WelcomeScreen, zoomToFitBounds } from '~/components/board/Imports';
import { AppState, BinaryFileData, Collaborator, DataURL, ExcalidrawInitialDataState, Gesture, SocketId } from '@excalidraw/excalidraw/types';
import { FileId, InitializedExcalidrawImageElement, OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { isInitializedImageElement, throttleRAF, measureText, getFontString, isTextElement } from '~/other/excalidraw';
import { ClientData, ClientToServerEvents, SceneBroadcastData, ServerToClientEvents, StatsData } from '~/other/types';
import { CollabUser, BoardsManager } from '@excali-boards/boards-api-client';
import { BoardExcalidrawState, BoardProps } from './types';
import { Component, ContextType, Suspense } from 'react';
import { PresenceContext } from '~/components/Context';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import msgPack from 'socket.io-msgpack-parser';
import { io, Socket } from 'socket.io-client';
import { TopBar } from '~/components/TopBar';
// eslint-disable-next-line import/no-unresolved
import '@excalidraw/excalidraw/index.css';
import throttle from 'lodash.throttle';
import { Buffer } from 'buffer';
import axios from 'axios';

export class ExcalidrawBoard extends Component<BoardProps, BoardExcalidrawState> {
	declare context: ContextType<typeof PresenceContext>;
	static contextType = PresenceContext;

	private broadcastedElementVersions = new Map<string, number>();
	private lastBoardcastedOrReceivedSceneVersion = -1;

	private trackedFiles = new Map<string, { isDeleted: boolean; isLoaded: boolean; data: BinaryFileData; }>();
	private apiClient: BoardsManager;

	private hiddenCollaborators: Map<SocketId, Collaborator> = new Map();
	private hideCollaborators = false;

	private initialDataResolve: ((data: ExcalidrawInitialDataState) => void) | null = null;
	private initialDataPromise: Promise<ExcalidrawInitialDataState> | null;

	private activeIntervalId: number | null;
	private idleTimeoutId: number | null;

	private onUmmount: (() => void) | null = null;

	constructor (props: BoardProps) {
		super(props);

		this.apiClient = new BoardsManager(props.socketUrl);

		this.state = {
			connectedBefore: false,
			isInitialized: false,
			isConnected: false,
			isFirstTime: true,
			isKicked: false,
			isSaved: false,

			excalidrawAPI: null,
			socketIO: null,
		};

		this.initialDataPromise = new Promise((resolve) => {
			this.initialDataResolve = resolve;
		});

		this.activeIntervalId = null;
		this.idleTimeoutId = null;
	}

	componentDidMount = () => {
		window.addEventListener('pointermove', this.onPointerMove);
		window.addEventListener('beforeunload', (event) => this.handleBeforeUnload(event, this.state.isSaved));
		window.addEventListener('visibilitychange', this.onVisibilityChange);
		window.addEventListener('resize', () => this.relayVisibleSceneBounds());
		window.addEventListener('keydown', this.handleKeyDown);
	};

	componentWillUnmount = () => {
		this.onUmmount?.();
		this.state.socketIO?.close();
		this.context?.setSocket?.(null);

		window.removeEventListener('pointermove', this.onPointerMove);
		window.removeEventListener('beforeunload', (event) => this.handleBeforeUnload(event, this.state.isSaved));
		window.removeEventListener('visibilitychange', this.onVisibilityChange);
		window.removeEventListener('resize', () => this.relayVisibleSceneBounds());
		window.removeEventListener('keydown', this.handleKeyDown);

		this.updateUserPointer.cancel();
		this.loadImageFiles.cancel();
		this.queueSave.cancel();
	};

	componentDidUpdate = (prevProps: BoardProps, prevState: BoardExcalidrawState) => {
		if (prevState.excalidrawAPI !== this.state.excalidrawAPI) {
			this.connectSocket(); this.setupEvents();
		}

		if (prevState.isSaved !== this.state.isSaved) {
			window.removeEventListener('beforeunload', (event) => this.handleBeforeUnload(event, prevState.isSaved));
			window.addEventListener('beforeunload', (event) => this.handleBeforeUnload(event, this.state.isSaved));
		}

		if (prevProps.hideCollaborators !== this.props.hideCollaborators) {
			this.toggleShowCollaborators(this.props.hideCollaborators);
		}
	};

	handleBeforeUnload = (event: BeforeUnloadEvent, isSaved: boolean) => {
		if (!isSaved) {
			event.preventDefault();
			this.queueSave?.();

			event.returnValue = 'no';
			return event.returnValue;
		}
	};

	setupEvents = () => {
		const unsubOnUserFollow = this.state.excalidrawAPI?.onUserFollow((payload) => {
			this.state.socketIO?.emit('userFollow', {
				...payload, action: payload.action.toLowerCase() as 'follow' | 'unfollow',
			});
		});

		const throttledRelayUserViewportBounds = throttleRAF(this.relayVisibleSceneBounds);

		const unsubOnScrollChange = this.state.excalidrawAPI?.onScrollChange(() => throttledRelayUserViewportBounds());

		this.onUmmount = () => {
			unsubOnUserFollow?.();
			unsubOnScrollChange?.();
		};
	};

	getAppStateProps = <K extends keyof AppState>(override?: Pick<AppState, K>) => {
		return {
			isLoading: !this.state.isInitialized || !this.state.isConnected,
			gridModeEnabled: this.props.canEdit && !this.props.isMobile,
			viewModeEnabled: !this.props.canEdit,

			...(override || {}),
		} satisfies Partial<Record<keyof AppState, AppState[keyof AppState]>>;
	};

	connectSocket = () => {
		const { boardId, token, socketUrl } = this.props;

		const socketIO: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
			auth: { token, room: boardId },
			parser: msgPack,
		});

		this.context?.setSocket?.(socketIO);

		socketIO.on('connect', () => {
			this.state.excalidrawAPI?.setToast({ message: 'Connected to server.', closable: true, duration: 1000 });
			if (this.props.isMobile) this.state.excalidrawAPI?.setActiveTool({ type: 'hand' });
			this.setState({ isConnected: true });
		});

		socketIO.on('disconnect', () => {
			this.state.excalidrawAPI?.setToast({ message: 'Disconnected from server.', closable: false });
			this.setState({ isConnected: false, isFirstTime: false });

			this.lastBoardcastedOrReceivedSceneVersion = -1;
			this.broadcastedElementVersions.clear();
			this.trackedFiles.clear();
		});

		socketIO.on('init', this.handleInit);
		socketIO.on('kick', this.handleKicked);
		socketIO.on('preloadFiles', this.loadImageFiles);
		socketIO.on('filesUpdated', (stats) => this.loadImageFilesWithElements(false, [], stats));
		socketIO.on('setCollaborators', this.handleSetCollaborators);
		socketIO.on('broadcastScene', this.handleBroadcastScene);
		socketIO.on('sendSnapshot', (data) => {
			this.handleBroadcastScene(data);
			this.toggleSave(true);
		});

		socketIO.on('isSaved', () => this.toggleSave(true));

		socketIO.on('followedBy', (data) => {
			this.state.excalidrawAPI?.updateScene({ appState: this.getAppStateProps({ followedBy: new Set(data as SocketId[]) }) });
			if (data.length > 0) this.relayVisibleSceneBounds(true);
		});

		socketIO.on('collaboratorPointerUpdate', (data) => {
			this.handleUpdateCollaborator({
				...data,
				socketId: data.socketId as SocketId,
				selectedElementIds: data.selectedElementIds?.reduce((acc, id) => {
					acc[id] = true;
					return acc;
				}, {} as Record<string, true>),
			});
		});

		socketIO.on('relayVisibleSceneBounds', (data) => {
			if (!this.state.excalidrawAPI) return;
			const appState = this.state.excalidrawAPI.getAppState();

			if (appState.userToFollow?.socketId !== data.socketId) return;
			else if (appState.userToFollow && appState.followedBy.has(appState.userToFollow.socketId)) return;

			this.state.excalidrawAPI.updateScene({
				appState: this.getAppStateProps(zoomToFitBounds({
					appState,
					bounds: data.bounds,
					fitToViewport: true,
					viewportZoomFactor: 1,
				}).appState),
			});
		});

		this.setState({ socketIO });
	};

	toggleSave = (state: boolean) => {
		if (this.state.isSaved !== state) console.log(`Board ${this.props.boardId} is ${state ? 'saved' : 'unsaved'}.`);
		this.setState({ isSaved: state });
		this.forceUpdate();
	};

	handleInit = (data: ClientData) => {
		if (!this.state.excalidrawAPI || !('elements' in data)) return;

		const localElements = this.state.excalidrawAPI.getSceneElementsIncludingDeleted();
		const appState = this.state.excalidrawAPI.getAppState();
		const reconciledElements = reconcileElements(
			localElements,
			data.elements,
			appState,
		);

		const mappedElements = !this.props.canEdit ? reconciledElements.map((element) => {
			if (element.customData?.hideFromViewOnly) return newElementWith(element, { isDeleted: true });
			return element;
		}) : reconciledElements;

		if (this.initialDataResolve) {
			this.initialDataResolve({
				elements: mappedElements,
				appState: this.getAppStateProps(),
			});

			this.initialDataResolve = null;
			this.initialDataPromise = null;
		} else {
			this.state.excalidrawAPI.updateScene({
				elements: mappedElements,
				appState: this.getAppStateProps(),
			});
		}

		if (reconciledElements.length && !this.state.connectedBefore) {
			setTimeout(() => {
				this.state.excalidrawAPI?.scrollToContent(reconciledElements, {
					fitToViewport: true,
					viewportZoomFactor: 0.5,
				});
			}, 500);
		}

		console.log(`Board ${this.props.boardId} initialized with ${reconciledElements.length} elements.`);

		this.lastBoardcastedOrReceivedSceneVersion = getSceneVersion(data.elements);
		this.state.excalidrawAPI.history.clear();
		this.toggleSave(true);

		this.setState({ isInitialized: true, connectedBefore: true });
	};

	handleKicked = () => {
		if (this.state.excalidrawAPI) this.sendSnapshot();
		this.state.socketIO?.close();

		this.setState({ isKicked: true });
	};

	toggleShowCollaborators = (state: boolean) => {
		if (!this.state.excalidrawAPI || this.hideCollaborators === state) return;

		if (this.hideCollaborators) {
			this.state.excalidrawAPI.updateScene({
				collaborators: new Map(
					[...this.hiddenCollaborators].map(([socketId, collaborator]) => [socketId, { ...collaborator, isCurrentUser: socketId === this.state.socketIO?.id }]),
				),
			});

			this.hiddenCollaborators.clear();
			this.hideCollaborators = false;
		} else {
			this.hiddenCollaborators = new Map(this.state.excalidrawAPI.getAppState().collaborators);
			this.state.excalidrawAPI.updateScene({ collaborators: new Map() });
			this.hideCollaborators = true;
		}
	};

	fetchImageFilesWithElements = async (elements: readonly OrderedExcalidrawElement[], forceFetchFiles?: boolean) => {
		const unfetchedImages = elements
			.filter((element) => {
				return (
					isInitializedImageElement(element) &&
					!element.isDeleted &&
					(forceFetchFiles ? ('status' in element && element.status !== 'pending' || Date.now() - element.updated > 10000) : 'status' in element && element.status !== 'error')
				);
			}).map((element) => (element as InitializedExcalidrawImageElement).fileId);

		return this.fetchImageFiles(unfetchedImages);
	};

	fetchImageFiles = async (fileIds: string[]) => {
		const loadedFiles: BinaryFileData[] = [];
		const erroredFiles: string[] = [];

		await Promise.all(
			fileIds.map(async (fileId) => {
				try {
					const response = await axios(`${this.props.s3Url}/${this.props.s3Bucket}/${this.props.boardId}/${fileId}`, {
						method: 'GET',
						responseType: 'arraybuffer',
					}).catch(() => null);
					if (!response || response.status !== 200) throw new Error(response?.data || 'Unknown error fetching file.');

					const buffer = await response.data as ArrayBuffer;
					const contentType = response.headers['content-type'] as BinaryFileData['mimeType'];
					if (!contentType) throw new Error('No content type.');

					const dataURL = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}` as DataURL;
					const fileData = this.trackedFiles.get(fileId);

					const data = fileData ? { ...fileData.data, dataURL } : {
						id: fileId as FileId,
						mimeType: contentType,
						created: Date.now(),
						dataURL,
					} satisfies BinaryFileData;

					if (fileData) {
						fileData.data = data;
						fileData.isLoaded = true;
					} else {
						this.trackedFiles.set(fileId, { isDeleted: false, isLoaded: true, data });
					}

					loadedFiles.push(data);
				} catch (e) {
					console.error(`Failed to fetch file ${fileId}:`, e);
					erroredFiles.push(fileId);
				}
			}),
		);

		return { loadedFiles, erroredFiles };
	};

	loadImageFilesWithElements: ReturnType<typeof throttle> = throttle(async (forceFetchFiles = false, elements?: OrderedExcalidrawElement[], stats?: StatsData) => {
		if (!this.state.excalidrawAPI) return;

		if (stats) {
			console.log(`Successfully uploaded ${stats.success} file${stats.success > 1 ? 's' : ''}, failed to upload ${stats.failed} file${stats.failed > 1 ? 's' : ''} out of ${stats.total} total.`);
			if (stats.failed > 0) {
				this.state.excalidrawAPI.setToast({
					message: `Failed to upload ${stats.failed} file${stats.failed > 1 ? 's' : ''}.`,
					closable: true,
					duration: 5000,
				});
			}
		}

		const { loadedFiles, erroredFiles } = await this.fetchImageFilesWithElements(
			elements && elements.length > 0 ? elements : this.state.excalidrawAPI.getSceneElementsIncludingDeleted(),
			forceFetchFiles,
		);

		this.updateFiles(loadedFiles, erroredFiles);
	}, 500);

	loadImageFiles: ReturnType<typeof throttle> = throttle(async (fileIds: string[]) => {
		if (!this.state.excalidrawAPI) return;

		const { loadedFiles, erroredFiles } = await this.fetchImageFiles(fileIds);
		this.updateFiles(loadedFiles, erroredFiles);
	}, 500);

	updateFiles = async (loadedFiles: BinaryFileData[], erroredFiles: string[], updateScene = true) => {
		if (!this.state.excalidrawAPI) return;

		if (loadedFiles.length > 0) {
			this.state.excalidrawAPI.addFiles(loadedFiles);
			if (updateScene) this.state.excalidrawAPI.updateScene({
				elements: this.state.excalidrawAPI
					.getSceneElementsIncludingDeleted()
					.map((element) => {
						if (isInitializedImageElement(element) && loadedFiles.map((file) => file.id).includes(element.fileId)) {
							return newElementWith(element, {
								status: 'saved',
							});
						}


						return element;
					}),
			});
		}

		if (erroredFiles.length > 0 && updateScene) {
			this.state.excalidrawAPI.updateScene({
				elements: this.state.excalidrawAPI
					.getSceneElementsIncludingDeleted()
					.map((element) => {
						if (isInitializedImageElement(element) && erroredFiles.includes(element.fileId)) {
							return newElementWith(element, {
								status: 'error',
							});
						}

						return element;
					}),
			});
		}
	};

	handleSetCollaborators = (collaborators: Collaborator[]) => {
		if (!this.state.excalidrawAPI) return;

		const currentCollaborators = this.hideCollaborators ? this.hiddenCollaborators : this.state.excalidrawAPI.getAppState().collaborators;
		const users: CollabUser[] = [];

		if (this.hideCollaborators) {
			this.hiddenCollaborators = new Map(
				collaborators.map((collaborator) => {
					if (collaborator.id) users.push({
						id: collaborator.id,
						username: collaborator.username || 'Unknown',
						avatarUrl: collaborator.avatarUrl || null,
						socketId: collaborator.socketId as SocketId,
					});

					return [
						collaborator.socketId as SocketId,
						{
							...collaborator,
							...(currentCollaborators.get(collaborator.socketId as SocketId) || {}),
							isCurrentUser: collaborator.socketId === this.state.socketIO?.id,
						},
					];
				}),
			);
		} else {
			this.state.excalidrawAPI.updateScene({
				collaborators: new Map(
					collaborators.map((collaborator) => {
						if (collaborator.id) users.push({
							id: collaborator.id,
							username: collaborator.username || 'Unknown',
							avatarUrl: collaborator.avatarUrl || null,
							socketId: collaborator.socketId as SocketId,
						});

						return [
							collaborator.socketId as SocketId,
							{
								...collaborator,
								...(currentCollaborators.get(collaborator.socketId as SocketId) || {}),
								isCurrentUser: collaborator.socketId === this.state.socketIO?.id,
							},
						];
					}),
				),
			});
		}

		this.props.updateCollaborators(users.filter((user, index, self) =>
			index === self.findIndex((u) => u.id === user.id),
		));
	};

	relayVisibleSceneBounds = (force = false) => {
		if (!this.state.excalidrawAPI) return;
		const appState = this.state.excalidrawAPI.getAppState();

		if (this.state.socketIO && (appState.followedBy.size > 0 || force)) {
			this.state.socketIO.emit('relayVisibleSceneBounds', {
				roomId: `follows@${this.state.socketIO.id}`,
				bounds: getVisibleSceneBounds(appState),
			});
		}
	};

	handleUpdateCollaborator = (payload: Partial<Collaborator>) => {
		if (!this.state.excalidrawAPI || !this.state.socketIO || !payload.socketId) return;

		const collaborators = new Map(this.hideCollaborators ? this.hiddenCollaborators : this.state.excalidrawAPI.getAppState().collaborators);
		const user = Object.assign({}, collaborators.get(payload.socketId), payload, { isCurrentUser: payload.socketId === this.state.socketIO.id });

		if (this.hideCollaborators) this.hiddenCollaborators.set(payload.socketId, user);
		else {
			collaborators.set(payload.socketId, user);
			this.state.excalidrawAPI.updateScene({ collaborators });
		}
	};

	handleBroadcastScene = (data: SceneBroadcastData) => {
		if (!this.state.excalidrawAPI) return;

		const reconciledElements = reconcileElements(this.state.excalidrawAPI.getSceneElementsIncludingDeleted(), data.elements, this.state.excalidrawAPI.getAppState());

		const version = getSceneVersion(reconciledElements);
		if (version <= this.lastBoardcastedOrReceivedSceneVersion) return;
		this.lastBoardcastedOrReceivedSceneVersion = version;

		this.state.excalidrawAPI.updateScene({
			elements: !this.props.canEdit ? reconciledElements.map((element) => {
				if (element.customData?.hideFromViewOnly) return newElementWith(element, { isDeleted: true });
				return element;
			}) : reconciledElements,
		});

	};

	onSceneChange = (elements: readonly OrderedExcalidrawElement[]) => {
		if (!this.state.socketIO || !this.state.excalidrawAPI || !this.props.canEdit) return;

		this.queueFileUpload();

		const version = getSceneVersion(elements);
		if (version <= this.lastBoardcastedOrReceivedSceneVersion) return;

		const syncableElements = elements.filter((element) => {
			return (
				(!this.broadcastedElementVersions.has(element.id) || element.version > this.broadcastedElementVersions.get(element.id)!) &&
				isSyncableElement(element)
			);
		});

		for (const element of syncableElements) {
			this.broadcastedElementVersions.set(element.id, element.version);
		}

		this.state.socketIO.emit('broadcastScene', { elements: syncableElements });
		this.lastBoardcastedOrReceivedSceneVersion = version;
		this.toggleSave(false);

		this.queueSave();
	};

	reportIdle = () => {
		if (!this.state.socketIO?.id) return;
		this.state.socketIO?.emit('collaboratorPointerUpdate', { state: 'idle', socketId: this.state.socketIO.id, username: this.props.user?.displayName });

		if (this.activeIntervalId) {
			window.clearInterval(this.activeIntervalId);
			this.activeIntervalId = null;
		}
	};

	reportActive = () => {
		if (!this.state.socketIO?.id) return;
		this.state.socketIO?.emit('collaboratorPointerUpdate', { state: 'active', socketId: this.state.socketIO.id, username: this.props.user?.displayName });
	};

	onPointerMove = () => {
		if (this.idleTimeoutId) {
			window.clearTimeout(this.idleTimeoutId);
			this.idleTimeoutId = null;
		}

		this.idleTimeoutId = window.setTimeout(this.reportIdle, 60 * 1000);

		if (!this.activeIntervalId) {
			this.activeIntervalId = window.setInterval(this.reportActive, 3 * 1000);
		}
	};

	onVisibilityChange = () => {
		if (!this.state.socketIO?.id) return;

		if (document.hidden) {
			if (this.idleTimeoutId) {
				window.clearTimeout(this.idleTimeoutId);
				this.idleTimeoutId = null;
			}

			if (this.activeIntervalId) {
				window.clearInterval(this.activeIntervalId);
				this.activeIntervalId = null;
			}

			this.state.socketIO?.emit('collaboratorPointerUpdate', { state: 'away', socketId: this.state.socketIO.id, username: this.props.user?.displayName });
		} else {
			this.idleTimeoutId = window.setTimeout(this.reportIdle, 60 * 1000);
			this.activeIntervalId = window.setInterval(this.reportActive, 3 * 1000);
			this.state.socketIO?.emit('collaboratorPointerUpdate', { state: 'active', socketId: this.state.socketIO.id, username: this.props.user?.displayName });
		}
	};

	updateUserPointer: ReturnType<typeof throttle> = throttle((payload: {
		pointer: { x: number; y: number; tool: 'pointer' | 'laser' };
		pointersMap: Gesture['pointers'];
		button: 'down' | 'up';
	}) => {
		if (payload.pointersMap.size > 2 || !this.state.socketIO?.id || !this.state.excalidrawAPI) return;

		const selectedElementIds = this.state.excalidrawAPI.getAppState().selectedElementIds;

		this.state.socketIO.emit('collaboratorPointerUpdate', {
			socketId: this.state.socketIO.id,
			username: this.props.user?.displayName,
			selectedElementIds: Object.keys(selectedElementIds),
			pointer: payload.pointer,
			button: payload.button,
		});
	}, 33);

	queueSave: ReturnType<typeof throttle> = throttle(() => this.sendSnapshot(), 10 * 1000, { leading: false });

	queueFileUpload: ReturnType<typeof throttle> = throttle(async () => {
		if (!this.state.excalidrawAPI) return;

		const files = this.state.excalidrawAPI.getFiles();
		const fileIds = new Set(Object.keys(files));

		const newFiles: BinaryFileData[] = [];
		const deletedFiles: BinaryFileData[] = [];

		for (const element of this.state.excalidrawAPI.getSceneElements()) {
			if (isInitializedImageElement(element) && fileIds.has(element.fileId)) {
				const tracked = this.trackedFiles.get(element.fileId);
				if (!tracked || tracked.isDeleted) {
					const file = files[element.fileId];
					if (file) newFiles.push(file);
				}
			}
		}

		const elementFileIds = new Set(this.state.excalidrawAPI.getSceneElements().filter((e) => isInitializedImageElement(e) && e.fileId).map((e) => (e as InitializedExcalidrawImageElement).fileId as string));

		for (const fileId of fileIds) {
			if (!elementFileIds.has(fileId)) {
				const tracked = this.trackedFiles.get(fileId);
				if (tracked && !tracked.isDeleted) {
					const file = files[fileId];
					if (file) deletedFiles.push(file);
				}
			}
		}

		if (newFiles.length > 0) this.newImagesAdded(newFiles);
		if (deletedFiles.length > 0) this.imagesDeleted(deletedFiles);
	}, 1000);

	sendSnapshot = () => {
		if (!this.state.socketIO || !this.state.excalidrawAPI) return;

		const allElements = this.state.excalidrawAPI.getSceneElementsIncludingDeleted();

		const newVersion = Math.max(getSceneVersion(allElements), this.lastBoardcastedOrReceivedSceneVersion);
		this.lastBoardcastedOrReceivedSceneVersion = newVersion;

		const syncElements = allElements.filter((element) => isSyncableElement(element));
		this.state.socketIO.emit('sendSnapshot', { elements: syncElements });

		for (const element of syncElements) {
			this.broadcastedElementVersions.set(element.id, element.version);
		}
	};

	newImagesAdded = async (files: BinaryFileData[]) => {
		for (const file of files) {
			const tracked = this.trackedFiles.get(file.id);
			if (tracked) this.trackedFiles.set(file.id, { ...tracked, isDeleted: false, isLoaded: false, data: file });
			else this.trackedFiles.set(file.id, { isDeleted: false, isLoaded: false, data: file });
		}

		const apiFiles = files
			.filter((file, index, self) => self.findIndex((f) => f.id === file.id) === index)
			.map((file) => ({
				id: file.id,
				data: file.dataURL,
				mimeType: file.mimeType,
			}));

		const result = await this.apiClient.files.uploadBase64Files({
			auth: this.props.token,
			boardId: this.props.boardId,
			files: apiFiles,
		}).catch(() => null);

		if (!result || 'error' in result) console.error('Failed to upload files:', result?.error || 'Unknown error uploading files.');
		else {
			console.log(`Successfully uploaded ${result.data.success} files.`);
			if (result.data.failed > 0) console.warn(`Failed to upload ${result.data.failed} files.`);
		}
	};

	imagesDeleted = async (files: BinaryFileData[]) => {
		const props = { isDeleted: false, isLoaded: false };

		for (const file of files) {
			const tracked = this.trackedFiles.get(file.id);
			if (tracked) this.trackedFiles.set(file.id, { ...tracked, isDeleted: true });
			else this.trackedFiles.set(file.id, { ...props, data: file, isDeleted: true });
		}

		const fileIds = files.map((file) => file.id).filter((id, index, self) => self.indexOf(id) === index);

		const result = await this.apiClient.files.deleteFiles({
			auth: this.props.token,
			boardId: this.props.boardId,
			fileIds,
		}).catch(() => null);

		if (!result || 'error' in result) console.error('Failed to delete files:', result?.error || 'Unknown error deleting files.');
		else console.log('Successfully deleted files.');
	};

	toggleHideFromViewOnly = () => {
		if (!this.state.excalidrawAPI) return;

		const appState = this.state.excalidrawAPI.getAppState();
		const selectedElementIds = Object.keys(appState.selectedElementIds);
		if (selectedElementIds.length === 0) return;

		const allElements = this.state.excalidrawAPI.getSceneElementsIncludingDeleted();
		const allHidden = allElements.filter((element) => selectedElementIds.includes(element.id)).every((element) => element.customData?.hideFromViewOnly);

		this.state.excalidrawAPI.updateScene({
			elements: this.state.excalidrawAPI.getSceneElementsIncludingDeleted().map((element) => {
				if (selectedElementIds.includes(element.id)) {
					const customData = {
						...element.customData,
						hideFromViewOnly: !allHidden,
					};

					return newElementWith(element, { customData }, true);
				}

				return element;
			}),
		});

		this.state.excalidrawAPI.setToast({
			message: `${allHidden ? 'Unhidden' : 'Hidden'} ${selectedElementIds.length} element${selectedElementIds.length > 1 ? 's' : ''} from view-only users.`,
			closable: true, duration: 1000,
		});
	};

	enableAutoResize = () => {
		if (!this.state.excalidrawAPI) return;

		const appState = this.state.excalidrawAPI.getAppState();
		const selectedElementIds = Object.keys(appState.selectedElementIds);
		if (selectedElementIds.length === 0) return;

		this.state.excalidrawAPI.updateScene({
			elements: this.state.excalidrawAPI.getSceneElementsIncludingDeleted().map((element) => {
				if (selectedElementIds.includes(element.id) && isTextElement(element) && !element.autoResize) {
					const metrics = measureText(element.originalText, getFontString(element), element.lineHeight);

					return newElementWith(element, {
						autoResize: true,
						width: metrics.width,
						height: metrics.height,
						text: element.originalText,
					});
				}

				return element;
			}),
		});

		this.state.excalidrawAPI.setToast({
			message: `Enabled auto-resize for ${selectedElementIds.length} element${selectedElementIds.length > 1 ? 's' : ''}.`,
			closable: true, duration: 1000,
		});
	};

	handleKeyDown = (event: KeyboardEvent) => {
		if (!this.props.canEdit || !this.state.excalidrawAPI) return;

		const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);
		const ctrlOrMeta = isMac ? event.metaKey : event.ctrlKey;

		if (ctrlOrMeta && event.shiftKey && event.key.toLowerCase() === 'o') {
			event.preventDefault();
			this.toggleHideFromViewOnly();
		}

		if (ctrlOrMeta && event.shiftKey && event.key.toLowerCase() === 'a') {
			event.preventDefault();
			this.enableAutoResize();
		}
	};

	render() {
		return (
			<Flex direction={'column'} w={'100%'} h={'100vh'} overflow={'hidden'}>
				{!this.state.isConnected && !this.state.isFirstTime && !this.state.isKicked && (
					<TopBar
						colorScheme={'red'}
						message={'You are currently disconnected from the server, changes will not be saved.'}
					/>
				)}

				{this.state.isKicked && (
					<TopBar
						colorScheme={'orange'}
						message={'You have been forcefully disconnected from the board.'}
					/>
				)}

				<Box
					w={'100%'} h={'100%'} overflow={'hidden'}
					filter={this.state.isKicked || !this.state.isConnected ? 'blur(15px)' : 'none'}
					display={this.state.isConnected || (!this.state.isConnected && !this.state.isFirstTime) ? 'block' : 'none'}
					pointerEvents={!this.state.isConnected || (!this.state.isConnected && !this.state.isFirstTime) || this.state.isKicked ? 'none' : 'auto'}
				>
					<Suspense fallback={<Spinner size={'xl'} thickness={'4px'} speed={'0.65s'} color={'white'} />}>
						<Excalidraw
							theme={this.props.useOppositeColorForBoard ? (this.props.colorMode === 'light' ? 'dark' : 'light') : this.props.colorMode}
							excalidrawAPI={(api) => this.setState({ excalidrawAPI: api })}
							viewModeEnabled={this.props.canEdit ? undefined : true}
							onPointerUpdate={this.updateUserPointer}
							libraryReturnUrl={this.props.currentUrl}
							initialData={this.initialDataPromise}
							onChange={this.onSceneChange}
							validateEmbeddable={true}
							name={this.props.name}
							isCollaborating={true}
							aiEnabled={false}
							autoFocus={true}
							UIOptions={{
								canvasActions: {
									clearCanvas: false,
									...((this.props.canEdit || this.props.canReallyEdit) ? {} : {
										export: false,
										saveAsImage: false,
										saveToActiveFile: false,
									}),
								},
							}}
						>
							<WelcomeScreen.Main>
								<WelcomeScreen.Center>
									<WelcomeScreen.CenterLogo />
								</WelcomeScreen.Center>
							</WelcomeScreen.Main>
						</Excalidraw>
					</Suspense>
				</Box>
			</Flex>
		);
	}
}
