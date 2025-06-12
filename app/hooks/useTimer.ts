import { useState, useCallback } from 'react';
import useInterval from '~/hooks/useInterval';

type UseTimerProps = {
    durationInMinutes: number;
    warnTimeSeconds: number;
    onEnd?: () => void;
    onWarn?: () => void;
}

export function useTimer({ durationInMinutes, warnTimeSeconds, onEnd, onWarn }: UseTimerProps) {
	const [timeLeft, setTimeLeft] = useState(durationInMinutes * 60); // in seconds
	const [isRunning, setIsRunning] = useState(false);

	const start = useCallback(() => setIsRunning(true), []);
	const stop = useCallback(() => setIsRunning(false), []);

	const reset = useCallback(() => {
		stop(); setTimeLeft(durationInMinutes * 60);
	}, [durationInMinutes, stop]);

	const set = useCallback((newTime: number) => {
		stop(); setTimeLeft(newTime * 60);
	}, [stop]);

	const getTime = useCallback(() => {
		const h = Math.floor(timeLeft / 3600);
		const m = Math.floor((timeLeft % 3600) / 60);
		const s = timeLeft % 60;

		return { h, m, s };
	}, [timeLeft]);

	useInterval(() => {
		if (timeLeft <= 0) {
			setIsRunning(false);
			if (onEnd) setTimeout(onEnd, 0);
			return;
		}

		if (warnTimeSeconds && timeLeft <= warnTimeSeconds) {
			if (onWarn) setTimeout(onWarn, 0);
		}

		setTimeLeft((prevTime) => prevTime - 1);
	}, isRunning ? 1000 : null);

	return {
		...getTime(),
		isRunning,
		start,
		stop,
		reset,
		set,
	};
}
