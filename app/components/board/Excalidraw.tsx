import type { ExcalidrawElement, ExcalidrawElementType, ExcalidrawFreeDrawElement, ExcalidrawLinearElement, OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, ElementOrToolType, NormalizedZoomValue, PointerCoords, Zoom } from '@excalidraw/excalidraw/types';
import type { ReconciledExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile';
import type { ElementUpdate } from '@excalidraw/excalidraw/element/mutateElement';
import type { SceneBounds } from '@excalidraw/excalidraw/element/bounds';
import type { MakeBrand } from '@excalidraw/excalidraw/utility-types';
import loadable from '@loadable/component';
import { memo } from 'react';

export default memo(loadable(() => import('@excalidraw/excalidraw'), {
	resolveComponent: (module) => module.Excalidraw,
	ssr: false,
}));

export const WelcomeScreen = {
	Main: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.WelcomeScreen,
		ssr: false,
	})),
	Center: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.WelcomeScreen.Center,
		ssr: false,
	})),
	CenterLogo: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.WelcomeScreen.Center.Logo,
		ssr: false,
	})),
};

export const MainMenu = {
	Main: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.MainMenu,
		ssr: false,
	})),
	Item: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.MainMenu.Item,
		ssr: false,
	})),
	Footer: memo(loadable(() => import('@excalidraw/excalidraw'), {
		resolveComponent: (module) => module.Footer,
		ssr: false,
	})),
};

export const getVisibleSceneBounds = ({
	scrollX,
	scrollY,
	width,
	height,
	zoom,
}: AppState): SceneBounds => {
	return [
		-scrollX,
		-scrollY,
		-scrollX + width / zoom.value,
		-scrollY + height / zoom.value,
	];
};

export const hashElementsVersion = (
	elements: readonly ExcalidrawElement[] = [],
): number => {
	let hash = 5381;

	for (let i = 0; i < elements?.length || 0; i++) {
		hash = (hash << 5) + hash + (elements[i]?.versionNonce || 0);
	}

	return hash >>> 0;
};

export const getSceneVersion = (elements: readonly ExcalidrawElement[]) => elements.reduce((acc, el) => acc + el.version, 0);

export const reconcileElements = (
	localElements: readonly ExcalidrawElement[],
	remoteElements: readonly ExcalidrawElement[],
	localAppState: AppState,
): ReconciledExcalidrawElement[] => {
	const localElementsMap = arrayToMap(localElements);
	const reconciledElements: ExcalidrawElement[] = [];
	const added = new Set<string>();

	for (const remoteElement of remoteElements) {
		if (!added.has(remoteElement.id)) {
			const localElement = localElementsMap.get(remoteElement.id);
			const discardRemoteElement = shouldDiscardRemoteElement(
				localAppState,
				localElement,
				remoteElement,
			);

			if (localElement && discardRemoteElement) {
				reconciledElements.push(localElement);
				added.add(localElement.id);
			} else {
				reconciledElements.push(remoteElement);
				added.add(remoteElement.id);
			}
		}
	}

	for (const localElement of localElements) {
		if (!added.has(localElement.id)) {
			reconciledElements.push(localElement);
			added.add(localElement.id);
		}
	}

	const orderedElements = orderByFractionalIndex(reconciledElements);
	return orderedElements as ReconciledExcalidrawElement[];
};

export const arrayToMap = <T extends { id: string } | string>(
	items: readonly T[] | Map<string, T>,
) => {
	if (items instanceof Map) {
		return items;
	}
	return items.reduce((acc: Map<string, T>, element) => {
		acc.set(typeof element === 'string' ? element : element.id, element);
		return acc;
	}, new Map());
};

const shouldDiscardRemoteElement = (
	localAppState: AppState,
	local: ExcalidrawElement | undefined,
	remote: ExcalidrawElement,
): boolean => {
	if (
		local &&
		(local.id === localAppState.editingTextElement?.id ||
			local.id === localAppState.resizingElement?.id ||
			local.id === localAppState.newElement?.id ||
			local.version > remote.version ||
			(local.version === remote.version &&
				local.versionNonce < remote.versionNonce))
	) return true;

	return false;
};

export const orderByFractionalIndex = <T extends ExcalidrawElement>(elements: T[]) => {
	return elements.sort((a, b) => {
		if (isOrderedElement(a) && isOrderedElement(b)) {
			if (a.index < b.index) return -1;
			else if (a.index > b.index) return 1;

			return a.id < b.id ? -1 : 1;
		}

		return 1;
	});
};

const isOrderedElement = (element: ExcalidrawElement): element is OrderedExcalidrawElement => {
	if (element.index) return true;
	return false;
};

export const zoomToFitBounds = ({
	bounds,
	appState,
	fitToViewport = false,
	viewportZoomFactor = 0.7,
}: {
	bounds: SceneBounds;
	appState: Readonly<AppState>;
	fitToViewport: boolean;
	viewportZoomFactor?: number;
}) => {
	const [x1, y1, x2, y2] = bounds;
	const centerX = (x1 + x2) / 2;
	const centerY = (y1 + y2) / 2;

	let newZoomValue;
	let scrollX;
	let scrollY;

	if (fitToViewport) {
		const commonBoundsWidth = x2 - x1;
		const commonBoundsHeight = y2 - y1;

		newZoomValue = Math.min(appState.width / commonBoundsWidth, appState.height / commonBoundsHeight) * Math.min(1, Math.max(viewportZoomFactor, 0.1));
		newZoomValue = Math.min(Math.max(newZoomValue, 0.1), 30.0) as NormalizedZoomValue;

		let appStateWidth = appState.width;

		if (appState.openSidebar) {
			const sidebarDOMElem = document.querySelector('.sidebar') as HTMLElement | null;
			const sidebarWidth = sidebarDOMElem?.offsetWidth ?? 0;
			const isRTL = document.documentElement.getAttribute('dir') === 'rtl';

			appStateWidth = !isRTL ? appState.width - sidebarWidth : appState.width + sidebarWidth;
		}

		scrollX = (appStateWidth / 2) * (1 / newZoomValue) - centerX;
		scrollY = (appState.height / 2) * (1 / newZoomValue) - centerY;
	} else {
		newZoomValue = zoomValueToFitBoundsOnViewport(bounds, {
			width: appState.width,
			height: appState.height,
		});

		const centerScroll = centerScrollOn({
			scenePoint: { x: centerX, y: centerY },
			viewportDimensions: {
				width: appState.width,
				height: appState.height,
			},
			zoom: { value: newZoomValue },
		});

		scrollX = centerScroll.scrollX;
		scrollY = centerScroll.scrollY;
	}

	return {
		commitToHistory: false,
		appState: {
			...appState,
			scrollX,
			scrollY,
			zoom: { value: newZoomValue },
		},
	};
};

export type SyncableExcalidrawElement = OrderedExcalidrawElement & MakeBrand<'SyncableExcalidrawElement'>;

export const isSyncableElement = (
	element: OrderedExcalidrawElement,
): element is SyncableExcalidrawElement => {
	if (element.isDeleted) {
		if (element.updated > Date.now() - 24 * 60 * 60 * 1000) return true;
		return false;
	}

	return !isInvisiblySmallElement(element);
};

export const isInvisiblySmallElement = (
	element: ExcalidrawElement,
): boolean => {
	if (isLinearElement(element) || isFreeDrawElement(element)) return (element.points?.length || 0) < 2;
	return element.width === 0 && element.height === 0;
};

export const isFreeDrawElement = (
	element?: ExcalidrawElement | null,
): element is ExcalidrawFreeDrawElement => {
	return element != null && isFreeDrawElementType(element.type);
};

export const isFreeDrawElementType = (
	elementType: ExcalidrawElementType,
): boolean => {
	return elementType === 'freedraw';
};

export const isLinearElement = (
	element?: ExcalidrawElement | null,
): element is ExcalidrawLinearElement => {
	return element != null && isLinearElementType(element.type);
};

export const isLinearElementType = (
	elementType: ElementOrToolType,
): boolean => {
	return (elementType === 'arrow' || elementType === 'line');
};

const zoomValueToFitBoundsOnViewport = (
	bounds: SceneBounds,
	viewportDimensions: { width: number; height: number },
) => {
	const [x1, y1, x2, y2] = bounds;
	const commonBoundsWidth = x2 - x1;
	const zoomValueForWidth = viewportDimensions.width / commonBoundsWidth;
	const commonBoundsHeight = y2 - y1;
	const zoomValueForHeight = viewportDimensions.height / commonBoundsHeight;
	const smallestZoomValue = Math.min(zoomValueForWidth, zoomValueForHeight);
	const zoomAdjustedToSteps = Math.floor(smallestZoomValue / 0.1) * 0.1;
	const clampedZoomValueToFitElements = Math.min(Math.max(zoomAdjustedToSteps, 0.1), 1);

	return clampedZoomValueToFitElements as NormalizedZoomValue;
};

export const centerScrollOn = ({
	scenePoint,
	viewportDimensions,
	zoom,
}: {
	scenePoint: PointerCoords;
	viewportDimensions: { height: number; width: number };
	zoom: Zoom;
}) => {
	return {
		scrollX: viewportDimensions.width / 2 / zoom.value - scenePoint.x,
		scrollY: viewportDimensions.height / 2 / zoom.value - scenePoint.y,
	};
};

export const newElementWith = <TElement extends ExcalidrawElement>(
	element: TElement,
	updates: ElementUpdate<TElement>,
	force = false,
): TElement => {
	let didChange = false;
	for (const key in updates) {
		const value = updates[key as keyof typeof updates];

		if (typeof value !== 'undefined') {
			if (element[key as keyof TElement] === value && (typeof value !== 'object' || value === null)) continue;
			didChange = true;
		}
	}

	if (!didChange && !force) return element;

	return {
		...element,
		...updates,
		updated: Date.now(),
		version: element.version + 1,
		versionNonce: Math.floor(Math.random() * 0x100000000),
	};
};
