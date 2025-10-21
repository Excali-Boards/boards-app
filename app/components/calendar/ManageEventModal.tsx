import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Textarea, Flex, Box, useColorMode, VisuallyHiddenInput, Text, HStack } from '@chakra-ui/react';
import { CalendarEvent } from '~/routes/groups.$groupId.calendar._index';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { FetcherWithComponents } from '@remix-run/react';
import 'react-datepicker/dist/react-datepicker.css';
import { DatePicker } from 'react-datepicker';
import { calendarColors } from '~/other/vars';
import Select from '~/components/Select';

export type ModalOpen = 'createEvent' | 'updateEvent' | 'viewEvent' | 'viewHoliday' | null;

export type ManageEventProps = {
	isOpen: boolean;
	onClose: () => void;
	canEdit: boolean;
	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;
	defaultEvent?: Partial<CalendarEvent>;
	eventId?: string;
	selectedDate?: string;
	onEdit?: () => void;
	onDelete?: () => void;
};

const colorOptions = Object.entries(calendarColors).map(([label, value]) => ({ value, label: label.charAt(0).toUpperCase() + label.slice(1) }));

export function ManageEvent({ isOpen, onClose, canEdit, type, fetcher, defaultEvent, eventId, selectedDate, onEdit, onDelete }: ManageEventProps) {
	const [selectedColor, setSelectedColor] = useState<string>(defaultEvent?.color || calendarColors.skyline);
	const [title, setTitle] = useState<string>(defaultEvent?.title || '');
	const [location, setLocation] = useState<string>(defaultEvent?.where || '');
	const [description, setDescription] = useState<string>(defaultEvent?.description || '');
	const { colorMode } = useColorMode();

	const [startDate, setStartDate] = useState<Date>(() => {
		if (defaultEvent?.start) return new Date(defaultEvent.start);
		if (selectedDate) {
			const date = new Date(selectedDate);
			date.setHours(9, 0, 0, 0);
			return date;
		}

		const now = new Date();
		now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
		return now;
	});

	const [endDate, setEndDate] = useState<Date>(() => {
		if (defaultEvent?.end) return new Date(defaultEvent.end);
		if (defaultEvent?.start) {
			const startTime = new Date(defaultEvent.start);
			const endTime = new Date(startTime);
			endTime.setHours(startTime.getHours() + 1);
			return endTime;
		}

		if (selectedDate) {
			const date = new Date(selectedDate);
			date.setHours(10, 0, 0, 0);
			return date;
		}

		const now = new Date();
		now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
		now.setHours(now.getHours() + 1);
		return now;
	});

	const handleStartDateChange = useCallback((date: Date | null) => {
		if (date) {
			setStartDate(date);
			if (date >= endDate) {
				const newEndDate = new Date(date);
				newEndDate.setHours(date.getHours() + 1);
				setEndDate(newEndDate);
			}
		}
	}, [endDate]);

	const handleEndDateChange = useCallback((date: Date | null) => {
		if (date) setEndDate(date);
	}, []);

	useEffect(() => {
		if (defaultEvent && (type === 'updateEvent' || type === 'viewEvent' || type === 'viewHoliday')) {
			setSelectedColor(defaultEvent.color || calendarColors.skyline);
			setTitle(defaultEvent.title || '');
			setLocation(defaultEvent.where || '');
			setDescription(defaultEvent.description || '');

			if (defaultEvent.start) setStartDate(new Date(defaultEvent.start));
			if (defaultEvent.end) setEndDate(new Date(defaultEvent.end));
		} else if (type === 'createEvent') {
			setSelectedColor(calendarColors.skyline);
			setTitle(defaultEvent?.title || '');
			setDescription('');
			setLocation('');

			if (defaultEvent?.start && defaultEvent?.end) {
				setStartDate(new Date(defaultEvent.start));
				setEndDate(new Date(defaultEvent.end));
			} else if (selectedDate) {
				const startDate = new Date(selectedDate);
				startDate.setMinutes(Math.ceil(startDate.getMinutes() / 15) * 15, 0, 0);
				startDate.setHours(9, 0, 0, 0);
				setStartDate(startDate);

				const endDate = new Date(selectedDate);
				endDate.setHours(10, 0, 0, 0);
				setEndDate(endDate);
			} else {
				const now = new Date();
				setStartDate(now);

				const endTime = new Date(now);
				endTime.setMinutes(Math.ceil(endTime.getMinutes() / 15) * 15, 0, 0);
				endTime.setHours(now.getHours() + 1);
				setEndDate(endTime);
			}
		}
	}, [defaultEvent, selectedDate, type]);

	const handleEditClick = useCallback(() => {
		onEdit?.();
	}, [onEdit]);

	const hasChanges = useMemo(() => {
		if (!defaultEvent || type !== 'updateEvent') return true;

		const normalizeDate = (date: Date | string | null | undefined) => {
			if (!date) return null;
			return new Date(date).toISOString();
		};

		const currentData = {
			title: title.trim(),
			description: description.trim(),
			location: location.trim(),
			color: selectedColor,
			start: normalizeDate(startDate),
			end: normalizeDate(endDate),
		};

		const originalData = {
			title: (defaultEvent.title || '').trim(),
			description: (defaultEvent.description || '').trim(),
			location: (defaultEvent.where || '').trim(),
			color: defaultEvent.color || calendarColors.skyline,
			start: normalizeDate(defaultEvent.start),
			end: normalizeDate(defaultEvent.end),
		};

		return JSON.stringify(currentData) !== JSON.stringify(originalData);
	}, [defaultEvent, type, title, description, location, selectedColor, startDate, endDate]);

	const getRelativeTime = useCallback((dateStr: string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const isFuture = diff > 0;
		let remaining = Math.abs(diff);

		const units = [
			{ label: 'y', ms: 1000 * 60 * 60 * 24 * 365 },
			{ label: 'mo', ms: 1000 * 60 * 60 * 24 * 30 },
			{ label: 'w', ms: 1000 * 60 * 60 * 24 * 7 },
			{ label: 'd', ms: 1000 * 60 * 60 * 24 },
			{ label: 'h', ms: 1000 * 60 * 60 },
			{ label: 'm', ms: 1000 * 60 },
		];

		const parts: string[] = [];

		for (const { label, ms } of units) {
			const value = Math.floor(remaining / ms);
			if (value > 0) {
				parts.push(`${value}${label}`);
				remaining -= value * ms;
			}

			if (parts.length >= 3) break;
		}

		if (parts.length === 0) return 'just now';
		return isFuture ? `in ${parts.join(' ')}` : `${parts.join(' ')} ago`;
	}, []);

	const formatDate = useCallback((dateStr: string) => {
		const date = new Date(dateStr);

		const getOrdinal = (n: number) => {
			const s = ['th', 'st', 'nd', 'rd'];
			const v = n % 100;
			return s[(v - 20) % 10] || s[v] || s[0];
		};

		const formatted = date.toLocaleString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: false,
		});

		return formatted.replace(/\b(\d{1,2})\b/, (match) => `${match}${getOrdinal(Number(match))}`);
	}, []);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method={'post'}>
					<ModalHeader>
						{type.split(/(?=[A-Z])/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
					</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<Flex flexDir='column' flexWrap='wrap' gap={4}>
							{type === 'createEvent' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='createEvent' />
									{selectedDate && <VisuallyHiddenInput onChange={() => { }} name='selectedDate' value={selectedDate} />}

									<FormControl>
										<FormLabel>Event Title</FormLabel>
										<Input
											id='eventTitle'
											name='eventTitle'
											placeholder='Enter event title..'
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											autoFocus
											required
										/>
									</FormControl>

									<Flex gap={4}>
										<FormControl flex={1}>
											<FormLabel>Start Date & Time</FormLabel>
											<DatePicker
												selected={startDate}
												onChange={handleStartDateChange}
												showTimeSelect
												timeIntervals={15}
												timeCaption='Time'
												timeFormat='HH:mm'
												dateFormat='MMM d, yy h:mm aa'
												customInput={
													<Input
														bg={colorMode === 'light' ? 'white' : 'brand800'}
														_focus={{ borderColor: 'blue.400' }}
													/>
												}
											/>
											<VisuallyHiddenInput onChange={() => { }} name='startDate' value={startDate.toISOString()} />
										</FormControl>
										<FormControl flex={1}>
											<FormLabel>End Date & Time</FormLabel>
											<DatePicker
												selected={endDate}
												onChange={handleEndDateChange}
												showTimeSelect
												timeIntervals={15}
												timeCaption='Time'
												timeFormat='HH:mm'
												dateFormat='MMM d, yy h:mm aa'
												minDate={startDate}
												customInput={
													<Input
														bg={colorMode === 'light' ? 'white' : 'brand800'}
														_focus={{ borderColor: 'blue.400' }}
													/>
												}
											/>
											<VisuallyHiddenInput onChange={() => { }} name='endDate' value={endDate.toISOString()} />
										</FormControl>
									</Flex>

									<FormControl>
										<FormLabel>Location</FormLabel>
										<Input
											name='eventLocation'
											placeholder='Enter event location..'
											value={location}
											onChange={(e) => setLocation(e.target.value)}
										/>
									</FormControl>

									<FormControl>
										<FormLabel>Description</FormLabel>
										<Textarea
											name='eventDescription'
											placeholder='Enter event description..'
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											resize='vertical'
											rows={3}
										/>
									</FormControl>

									<FormControl>
										<FormLabel>Color</FormLabel>
										<Flex alignItems='center' gap={2}>
											<Select
												name='eventColor'
												placeholder='Select event color..'
												defaultValue={colorOptions.find(c => c.value === selectedColor)}
												onChange={(option) => setSelectedColor(option?.value || calendarColors.skyline)}
												options={colorOptions}
												optionStyles={(_, { data }) => ({
													color: data.value,
												})}
											/>

											<Input
												isReadOnly
												value={''}
												bg={selectedColor}
												w={10}
											/>
										</Flex>
									</FormControl>
								</>
							)}

							{type === 'updateEvent' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='updateEvent' />
									<VisuallyHiddenInput onChange={() => { }} name='eventId' value={eventId || ''} />

									<FormControl>
										<FormLabel>Event Title</FormLabel>
										<Input
											id='eventTitle'
											name='eventTitle'
											placeholder='Enter event title..'
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											autoFocus
											required
										/>
									</FormControl>

									<Flex gap={4}>
										<FormControl flex={1}>
											<FormLabel>Start Date & Time</FormLabel>
											<DatePicker
												selected={startDate}
												onChange={handleStartDateChange}
												showTimeSelect
												timeIntervals={15}
												timeCaption='Time'
												timeFormat='HH:mm'
												dateFormat='MMM d, yy h:mm aa'
												customInput={
													<Input
														bg={colorMode === 'light' ? 'white' : 'brand800'}
														_focus={{ borderColor: 'blue.400' }}
													/>
												}
											/>
											<VisuallyHiddenInput onChange={() => { }} name='startDate' value={startDate.toISOString()} />
										</FormControl>
										<FormControl flex={1}>
											<FormLabel>End Date & Time</FormLabel>
											<DatePicker
												selected={endDate}
												onChange={handleEndDateChange}
												showTimeSelect
												timeIntervals={15}
												timeCaption='Time'
												timeFormat='HH:mm'
												dateFormat='MMM d, yy h:mm aa'
												minDate={startDate}
												customInput={
													<Input
														bg={colorMode === 'light' ? 'white' : 'brand800'}
														_focus={{ borderColor: 'blue.400' }}
													/>
												}
											/>
											<VisuallyHiddenInput onChange={() => { }} name='endDate' value={endDate.toISOString()} />
										</FormControl>
									</Flex>

									<FormControl>
										<FormLabel>Location</FormLabel>
										<Input
											name='eventLocation'
											placeholder='Enter event location..'
											value={location}
											onChange={(e) => setLocation(e.target.value)}
										/>
									</FormControl>

									<FormControl>
										<FormLabel>Description</FormLabel>
										<Textarea
											name='eventDescription'
											placeholder='Enter event description..'
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											resize='vertical'
											rows={3}
										/>
									</FormControl>

									<FormControl>
										<FormLabel>Color</FormLabel>
										<Flex alignItems='center' gap={2}>
											<Select
												name='eventColor'
												placeholder='Select event color..'
												defaultValue={colorOptions.find(c => c.value === selectedColor)}
												onChange={(option) => setSelectedColor(option?.value || calendarColors.skyline)}
												options={colorOptions}
												optionStyles={(_, { data }) => ({
													color: data.value,
												})}
											/>

											<Input
												isReadOnly
												value={''}
												bg={selectedColor}
												w={10}
											/>
										</Flex>
									</FormControl>
								</>
							)}

							{(type === 'viewEvent' || type === 'viewHoliday') && (
								<VStack align='stretch' spacing={4}>
									<Box>
										<Text fontWeight='bold' mb={2}>Title</Text>
										<Text>{defaultEvent?.title || 'No title'}</Text>
									</Box>

									<HStack spacing={4}>
										<Box flex={1}>
											<Text fontWeight='bold' mb={2}>Relative Start</Text>
											<Text>{defaultEvent?.start ? getRelativeTime(defaultEvent.start) : 'No start date'}</Text>
										</Box>
										<Box flex={1}>
											<Text fontWeight='bold' mb={2}>Relative End</Text>
											<Text>{defaultEvent?.end ? getRelativeTime(defaultEvent.end) : 'No end date'}</Text>
										</Box>
									</HStack>

									<HStack spacing={4}>
										<Box flex={1}>
											<Text fontWeight='bold' mb={2}>Start Date & Time</Text>
											<Text>{defaultEvent?.start ? formatDate(defaultEvent.start) : 'No start date'}</Text>
										</Box>
										<Box flex={1}>
											<Text fontWeight='bold' mb={2}>End Date & Time</Text>
											<Text>{defaultEvent?.end ? formatDate(defaultEvent.end) : 'No end date'}</Text>
										</Box>
									</HStack>

									{defaultEvent?.where && (
										<Box>
											<Text fontWeight='bold' mb={2}>Location</Text>
											<Text>{defaultEvent.where}</Text>
										</Box>
									)}

									{defaultEvent?.description && (
										<Box>
											<Text fontWeight='bold' mb={2}>Description</Text>
											<Text>{defaultEvent.description}</Text>
										</Box>
									)}

									<Box>
										<Text fontWeight='bold' mb={2}>Color</Text>
										<HStack>
											<Box w={4} h={4} bg={defaultEvent?.color || calendarColors.skyline} borderRadius='sm' />
											<Text>{colorOptions.find(c => c.value === defaultEvent?.color)?.label || 'Unknown'}</Text>
										</HStack>
									</Box>
								</VStack>
							)}
						</Flex>
					</ModalBody>
					<ModalFooter display={'flex'} gap={1}>
						{type === 'viewEvent' && canEdit ? (
							<>
								<Button flex={1} colorScheme='gray' onClick={onClose}>
									Close
								</Button>
								<Button flex={1} colorScheme='red' onClick={onDelete}>
									Delete
								</Button>
								<Button flex={1} colorScheme='blue' onClick={handleEditClick}>
									Edit
								</Button>
							</>
						) : (type === 'viewHoliday' || !canEdit) ? (
							<>
								<Button flex={1} colorScheme='gray' onClick={onClose}>
									Close
								</Button>
							</>
						) : (
							<>
								<Button
									flex={1}
									colorScheme='gray'
									onClick={onClose}
								>
									Cancel
								</Button>
								<Button
									flex={1}
									isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
									colorScheme='blue'
									type='submit'
									isDisabled={type === 'updateEvent' && !hasChanges}
									title={type === 'updateEvent' && !hasChanges ? 'No changes to save' : undefined}
								>
									{type.split(/(?=[A-Z])/).map((word) => word.charAt(0).toUpperCase() + word.slice(1))[0]}
								</Button>
							</>
						)}
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}