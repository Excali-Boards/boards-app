import { Button, Center, Divider, Flex, Icon, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Spinner, Text, VStack, useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { getSafeBackTo, QrLoginData, QrPollResponse } from '~/other/qr-login';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import { QRCode } from 'react-qrcode-logo';

const QR_REDIRECT_DELAY_SECONDS = 3;

export type QrFlowStatus = 'idle' | 'loading' | 'pending' | 'denied' | 'expired' | 'error';

export type QrStartResponse = {
	data?: QrLoginData;
	error?: string;
};

export type QrLoginProps = {
	backTo: string;
	isOpen: boolean;
	onClose: () => void;
};

export function QrLogin({ backTo, isOpen, onClose }: QrLoginProps) {
	const { colorMode } = useColorMode();
	const qrSize = useBreakpointValue({ base: 220, sm: 260 }) || 220;
	const [data, setData] = useState<QrLoginData | null>(null);
	const [status, setStatus] = useState<QrFlowStatus>('idle');
	const [error, setError] = useState<string | null>(null);
	const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);
	const [redirectPath, setRedirectPath] = useState<string | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const starting = useRef(false);

	const start = useCallback(async () => {
		if (starting.current) return;
		starting.current = true;
		setData(null);
		setError(null);
		setRedirectSeconds(null);
		setRedirectPath(null);
		setStatus('loading');

		try {
			const formData = new FormData();
			formData.set('backTo', getSafeBackTo(backTo));

			const response = await fetch('/login/qr/start', {
				method: 'POST',
				body: formData,
				credentials: 'same-origin',
				headers: { Accept: 'application/json' },
			});

			const result = await response.json() as QrStartResponse;
			if (!response.ok || !result.data) {
				setStatus('error');
				setError(result.error || 'QR login is temporarily unavailable.');
				return;
			}

			setData(result.data);
			setStatus('pending');
		} catch {
			setStatus('error');
			setError('QR login is temporarily unavailable.');
		} finally {
			starting.current = false;
		}
	}, [backTo]);

	useEffect(() => {
		if (isOpen) void start();
	}, [isOpen, start]);

	useEffect(() => {
		if (!data) return;
		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [data]);

	useEffect(() => {
		if (redirectSeconds === null || !redirectPath) return;
		if (redirectSeconds === 0) {
			window.location.assign(redirectPath);
			return;
		}

		const timer = window.setTimeout(() => setRedirectSeconds((seconds) => seconds === null ? null : seconds - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [redirectPath, redirectSeconds]);

	useEffect(() => {
		if (!isOpen || !data || status !== 'pending') return;
		let stopped = false;
		let timer: number | undefined;
		let failures = 0;

		const poll = async () => {
			if (stopped) return;
			if (new Date(data.expiresAt).getTime() <= Date.now()) {
				setStatus('expired');
				return;
			}

			try {
				const response = await fetch('/login/qr/redeem', {
					method: 'POST',
					credentials: 'same-origin',
					headers: { Accept: 'application/json' },
				});

				const result = await response.json() as QrPollResponse;
				if (stopped) return;

				if (response.ok && result.status === 'approved') {
					stopped = true;
					const safeBackTo = getSafeBackTo(data.backTo);
					setRedirectPath(safeBackTo);
					if (result.redirectDelay === false) window.location.assign(safeBackTo);
					else setRedirectSeconds(QR_REDIRECT_DELAY_SECONDS);
					return;
				}

				if (response.ok && result.status === 'denied') {
					stopped = true;
					setStatus('denied');
					return;
				}

				if (response.ok && result.status === 'expired') {
					stopped = true;
					setStatus('expired');
					return;
				}

				failures = response.ok ? 0 : failures + 1;
				const delay = response.ok ? 5000 : Math.min(30000, 5000 * 2 ** Math.min(failures, 3));
				timer = window.setTimeout(() => void poll(), delay);
			} catch {
				if (!stopped) {
					failures += 1;
					timer = window.setTimeout(() => void poll(), Math.min(30000, 5000 * 2 ** Math.min(failures, 3)));
				}
			}
		};

		timer = window.setTimeout(() => void poll(), 5000);
		return () => {
			stopped = true;
			if (timer !== undefined) window.clearTimeout(timer);
		};
	}, [data, isOpen, status]);

	const close = useCallback(() => {
		setData(null);
		setError(null);
		setRedirectSeconds(null);
		setRedirectPath(null);
		setStatus('idle');
		onClose();
	}, [onClose]);

	const secondsRemaining = useMemo(() => data ? Math.max(0, Math.ceil((new Date(data.expiresAt).getTime() - now) / 1000)) : 0, [data, now]);
	const expired = status === 'expired' || (!!data && secondsRemaining === 0);
	const statusText = status === 'denied'
		? 'This sign-in was denied on the phone.'
		: expired
			? 'This QR code has expired.'
			: status === 'error'
				? error || 'The QR login request could not be started.'
				: 'Waiting for approval on your phone..';

	return (
		<Modal isOpen={isOpen} onClose={close} isCentered size='md' scrollBehavior='inside'>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Log in with QR code</ModalHeader>
				<ModalCloseButton />
				<ModalBody overflowX='hidden'>
					<VStack w='100%' align='center' spacing={4}>
						{data && redirectSeconds !== null ? (
							<Flex direction='column' align='center' p={6} rounded='lg' bg='alpha100' w='100%' gap={5}>
								<Icon as={FaCheckCircle} boxSize={14} color='green.300' />
								<Text fontSize='2xl' fontWeight='bold' textAlign='center'>Sign-in Approved</Text>
								<Divider />
								<Text textAlign='center'>Successfully signed in. Redirecting in {redirectSeconds}..</Text>
							</Flex>
						) : data && (expired || status === 'denied') ? (
							<Flex direction='column' align='center' p={6} rounded='lg' bg='alpha100' w='100%' gap={5}>
								<Icon as={status === 'denied' ? FaTimesCircle : FaClock} boxSize={14} color='red.300' />
								<Text fontSize='2xl' fontWeight='bold' textAlign='center'>{status === 'denied' ? 'Sign-in Denied' : 'QR Code Expired'}</Text>
								<Divider />
								<Text textAlign='center'>
									{status === 'denied' ? 'This sign-in was denied on the phone.' : 'This QR code has expired.'}
									<br />
									Generate a new QR code to try again.
								</Text>
							</Flex>
						) : data ? (
							<>
								<Center>
									<QRCode
										logoImage='/logo-tr.webp'
										removeQrCodeBehindLogo={true}
										logoPaddingStyle='circle'
										logoPaddingRadius={10}
										value={data.approvalUrl}
										logoHeight={70}
										logoWidth={70}
										eyeRadius={15}
										quietZone={10}
										qrStyle='dots'
										size={qrSize}
										style={{ borderRadius: '12px', maxWidth: '100%', height: 'auto' }}
									/>
								</Center>

								<Text fontSize='2xl' fontWeight='bold' letterSpacing='widest'>{data.userCode}</Text>

								<Text textAlign='center' color={expired || status === 'denied' ? 'red.400' : colorMode === 'dark' ? 'gray.300' : 'gray.600'}>{statusText}</Text>
								<Text fontSize='sm' textAlign='center' color='gray.500'>
									{expired ? 'Generate a new code to try again.' : `Expires in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`}
								</Text>
							</>
						) : status === 'loading' ? (
							<Spinner />
						) : (
							<>
								<Text textAlign='center'>{status === 'error' ? statusText : 'Use your phone to approve a new browser sign-in.'}</Text>
								{status === 'error' && <Text color='red.400' textAlign='center'>{error}</Text>}
							</>
						)}

					</VStack>
				</ModalBody>
				<ModalFooter display='flex' gap={1}>
					<Button flex={1} type='button' onClick={close} colorScheme='gray'>Cancel</Button>
					{data && (expired || status === 'denied') && (
						<Button flex={1} type='button' colorScheme='brand' onClick={() => void start()}>Generate new QR</Button>
					)}
					{!data && status !== 'loading' && (
						<Button flex={1} type='button' colorScheme='brand' onClick={() => void start()}>Generate QR code</Button>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
