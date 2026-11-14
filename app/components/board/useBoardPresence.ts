import type { PresenceContextValue, PresenceSocket } from '~/components/Context';
import { PresenceState } from '~/other/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const IDLE_TIMEOUT_MS = 90 * 1000;
const ACTIVITY_THROTTLE_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

const isPageAvailable = () => !document.hidden && document.hasFocus();

export type BoardPresence = {
	presenceSocket: PresenceSocket | null;
	presenceContextValue: PresenceContextValue;
};

export function useBoardPresence(): BoardPresence {
	const initialPageAvailable = typeof document !== 'undefined' && isPageAvailable();
	const [presenceSocket, setPresenceSocketState] = useState<PresenceSocket | null>(null);
	const presenceSocketRef = useRef<PresenceSocket | null>(null);
	const currentStateRef = useRef<PresenceState>(initialPageAvailable ? 'active' : 'away');
	const lastUserActivityAtRef = useRef(initialPageAvailable ? Date.now() : 0);
	const activityRafRef = useRef<number | null>(null);
	const idleTimerRef = useRef<number | null>(null);
	const lastActivityEventAtRef = useRef(0);

	const clearIdleTimer = useCallback(() => {
		if (idleTimerRef.current !== null) {
			window.clearTimeout(idleTimerRef.current);
			idleTimerRef.current = null;
		}
	}, []);

	const emitPresence = useCallback((state: PresenceState, force = false) => {
		const previousState = currentStateRef.current;
		currentStateRef.current = state;

		if (state !== 'active') clearIdleTimer();
		if (!force && previousState === state) return;

		presenceSocketRef.current?.emit?.('presenceUpdate', { state });
	}, [clearIdleTimer]);

	const armIdleTimer = useCallback(() => {
		clearIdleTimer();
		idleTimerRef.current = window.setTimeout(() => {
			idleTimerRef.current = null;
			emitPresence(isPageAvailable() ? 'idle' : 'away');
		}, IDLE_TIMEOUT_MS);
	}, [clearIdleTimer, emitPresence]);

	const markActivity = useCallback(() => {
		if (!isPageAvailable()) {
			emitPresence('away');
			return;
		}

		lastUserActivityAtRef.current = Date.now();
		emitPresence('active');
		if (presenceSocketRef.current?.connected) presenceSocketRef.current.emit?.('presenceActivity');
		armIdleTimer();
	}, [armIdleTimer, emitPresence]);

	const handleActivityEvent = useCallback(() => {
		const now = Date.now();
		if (now - lastActivityEventAtRef.current < ACTIVITY_THROTTLE_MS) return;
		lastActivityEventAtRef.current = now;

		if (activityRafRef.current !== null) return;
		activityRafRef.current = window.requestAnimationFrame(() => {
			activityRafRef.current = null;
			markActivity();
		});
	}, [markActivity]);

	const setPresenceSocket = useCallback((socket: PresenceSocket | null) => {
		presenceSocketRef.current = socket;
		setPresenceSocketState(socket);
	}, []);

	const syncPresence = useCallback(() => {
		const now = Date.now();
		if (!isPageAvailable()) {
			emitPresence('away', true);
			return;
		}

		if (currentStateRef.current === 'active') {
			if (lastUserActivityAtRef.current === 0) lastUserActivityAtRef.current = now;
			if (now - lastUserActivityAtRef.current >= IDLE_TIMEOUT_MS) {
				emitPresence('idle', true);
				return;
			}

			emitPresence('active', true);
			armIdleTimer();
			return;
		}

		emitPresence('idle', true);
	}, [armIdleTimer, emitPresence]);

	const sendHeartbeat = useCallback(() => {
		const socket = presenceSocketRef.current;
		if (!socket?.connected) return;

		if (!isPageAvailable()) {
			emitPresence('away');
			return;
		}

		if (currentStateRef.current !== 'active') return;
		if (Date.now() - lastUserActivityAtRef.current >= IDLE_TIMEOUT_MS) {
			emitPresence('idle');
			return;
		}

		socket.emit?.('presenceHeartbeat');
	}, [emitPresence]);

	useEffect(() => {
		const activityEvents = [
			'mousemove', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'wheel',
			'touchstart', 'touchmove', 'pointerdown', 'pointermove', 'scroll', 'focusin',
		] as const;

		const handleVisibilityChange = () => {
			if (document.hidden) emitPresence('away');
			else emitPresence(isPageAvailable() ? 'idle' : 'away');
		};
		const handleFocus = () => {
			if (isPageAvailable()) emitPresence('idle');
		};
		const handleBlur = () => emitPresence('away');
		const handlePageShow = () => {
			if (isPageAvailable()) emitPresence('idle');
			else emitPresence('away');
		};

		for (const event of activityEvents) window.addEventListener(event, handleActivityEvent, { passive: true });
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleFocus);
		window.addEventListener('blur', handleBlur);
		window.addEventListener('pageshow', handlePageShow);

		if (isPageAvailable() && currentStateRef.current === 'active') armIdleTimer();
		else if (!isPageAvailable()) emitPresence('away');

		return () => {
			for (const event of activityEvents) window.removeEventListener(event, handleActivityEvent);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleFocus);
			window.removeEventListener('blur', handleBlur);
			window.removeEventListener('pageshow', handlePageShow);

			clearIdleTimer();
			if (activityRafRef.current !== null) {
				window.cancelAnimationFrame(activityRafRef.current);
				activityRafRef.current = null;
			}
		};
	}, [armIdleTimer, clearIdleTimer, emitPresence, handleActivityEvent]);

	useEffect(() => {
		if (!presenceSocket) return;

		const handleConnect = () => syncPresence();
		presenceSocket.on?.('connect', handleConnect);
		if (presenceSocket.connected) syncPresence();

		const heartbeatInterval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
		return () => {
			presenceSocket.off?.('connect', handleConnect);
			window.clearInterval(heartbeatInterval);
		};
	}, [presenceSocket, sendHeartbeat, syncPresence]);

	const presenceContextValue = useMemo<PresenceContextValue>(() => ({
		socket: presenceSocket,
		setSocket: setPresenceSocket,
	}), [presenceSocket, setPresenceSocket]);

	return { presenceSocket, presenceContextValue };
}
