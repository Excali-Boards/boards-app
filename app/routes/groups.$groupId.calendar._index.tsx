import { CalendarEventExternal, createViewDay, createViewMonthGrid, createViewWeek } from '@schedule-x/calendar';
import { VStack, Box, Flex, useToast, useColorMode, useBreakpointValue } from '@chakra-ui/react';
import { canEdit, canManage, closest15MinuteCreate, validateParams } from '~/other/utils';
import { useEffect, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { CalendarHeader, CalendarView } from '~/components/calendar/CalendarHeader';
import { ManageEvent, ModalOpen } from '~/components/calendar/ManageEventModal';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import { CountryCodeModal } from '~/components/calendar/CountryCodeModal';
import type { FormattedHoliday } from '@excali-boards/boards-api-client';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import { Jsonify } from '@remix-run/server-runtime/dist/jsonify';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ConfirmModal } from '~/components/other/ConfirmModal';
import { colorCalendars, calendarColors } from '~/other/vars';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { createResizePlugin } from '@schedule-x/resize';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import '@schedule-x/theme-default/dist/index.css';
import { useHotkeys } from '~/hooks/useHotkey';
import { WebReturnType } from '~/other/types';
import { api } from '~/utils/web.server';
import '~/styles/schedule-x-theme.css';
import 'temporal-polyfill/global';

export type CalendarEvent = {
	id: string;
	title: string;
	start: string;
	end: string;
	description: string | null;
	where: string | null;
	color: string;
};

export type EventData = CalendarEvent | Jsonify<FormattedHoliday>;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const calendarData = await api?.calendar.getCalendar({ auth: token, groupId });
	if (!calendarData || 'error' in calendarData) throw makeResponse(calendarData, 'Failed to get calendar data.');

	const currentYear = new Date().getFullYear();
	const holidays: FormattedHoliday[] = [];
	if (calendarData.data.group.calendarCode) {
		const years = [currentYear - 1, currentYear, currentYear + 1];

		for (const year of years) {
			const holidaysData = await api?.calendar.getHolidays({
				auth: token,
				countryCode: calendarData.data.group.calendarCode,
				year,
			});

			if (holidaysData && !('error' in holidaysData)) {
				holidays.push(...holidaysData.data);
			}
		}
	}

	return { ...calendarData.data, holidays };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'createEvent': {
			const eventTitle = formData.get('eventTitle') as string;
			const startDate = formData.get('startDate') as string;
			const endDate = formData.get('endDate') as string;
			const eventDescription = formData.get('eventDescription') as string;
			const eventLocation = formData.get('eventLocation') as string;
			const eventColor = formData.get('eventColor') as string;

			const result = await api?.calendar.createEvent({
				auth: token,
				groupId,
				event: {
					title: eventTitle,
					start: new Date(startDate),
					end: new Date(endDate),
					description: eventDescription,
					where: eventLocation,
					color: eventColor,
				},
			});

			return makeResObject(result, 'Failed to create event.');
		}
		case 'updateEvent': {
			const eventId = formData.get('eventId') as string;
			const eventTitle = formData.get('eventTitle') as string;
			const startDate = formData.get('startDate') as string;
			const endDate = formData.get('endDate') as string;
			const eventDescription = formData.get('eventDescription') as string;
			const eventLocation = formData.get('eventLocation') as string;
			const eventColor = formData.get('eventColor') as string;

			if (!eventId || !eventTitle || !startDate || !endDate) return makeResObject(null, 'Event ID, title, start date, and end date are required.');

			const result = await api?.calendar.updateEvent({
				auth: token,
				groupId,
				eventId,
				event: {
					title: eventTitle,
					start: new Date(startDate),
					end: new Date(endDate),
					description: eventDescription,
					where: eventLocation,
					color: eventColor,
				},
			});

			return makeResObject(result, 'Failed to update event.');
		}
		case 'deleteEvent': {
			const eventId = formData.get('eventId') as string;
			if (!eventId) return makeResObject(null, 'Event ID is required.');

			const result = await api?.calendar.deleteEvent({
				auth: token,
				groupId,
				eventId,
			});

			return makeResObject(result, 'Failed to delete event.');
		}
		case 'updateCountryCode': {
			const countryCode = formData.get('countryCode') as string;
			const calCode = countryCode === '' ? null : countryCode;

			const result = await api?.calendar.updateGroupCalendarCode({
				auth: token,
				groupId,
				calCode,
			});

			return makeResObject(result, 'Failed to update country code.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function GroupCalendar() {
	const { group, events: initialEvents, holidays: initialHolidays } = useLoaderData<typeof loader>();
	const { useOppositeColorForBoard } = useContext(RootContext) || {};
	const { colorMode } = useColorMode();

	const isDark = useMemo(() => (colorMode === 'dark' ? !useOppositeColorForBoard : useOppositeColorForBoard), [colorMode, useOppositeColorForBoard]);
	const isMobile = useBreakpointValue({ base: true, md: false }) || false;

	const [currentDate, setCurrentDate] = useState(() => Temporal.Now.plainDateISO());
	const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
	const [currentView, setCurrentViewOriginal] = useState<CalendarView>('month-grid');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showCountryModal, setShowCountryModal] = useState(false);
	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const originalEventStateRef = useRef<Map<string, CalendarEvent>>(new Map());
	const calendarRef = useRef<ReturnType<typeof useCalendarApp> | null>(null);
	const holidayIdsRef = useRef<Set<string>>(new Set());

	const calendarControlsPlugin = useMemo(() => createCalendarControlsPlugin(), []);
	const dragAndDropPlugin = useMemo(() => createDragAndDropPlugin(15), []);
	const eventsService = useMemo(() => createEventsServicePlugin(), []);
	const resizePlugin = useMemo(() => createResizePlugin(), []);

	const isAnyModalOpen = modalOpen !== null || showCountryModal || showDeleteConfirm;

	useFetcherResponse(fetcher, toast, () => {
		setModalOpen(null);
		setSelectedEvent(null);
	});

	const handleEventCreate = useCallback((event?: Partial<CalendarEvent>) => {
		setSelectedEvent(event || null);
		setModalOpen('createEvent');
	}, []);

	const handleEventUpdate = useCallback((eventId: string, updatedEvent: Partial<CalendarEvent>) => {
		const calendarEvent = calendarRef.current?.events.get(eventId);

		let existingData: Partial<CalendarEvent> = {};
		if (calendarEvent) {
			existingData = {
				title: calendarEvent.title,
				start: new Date((calendarEvent.start as Temporal.ZonedDateTime).epochMilliseconds).toISOString(),
				end: new Date((calendarEvent.end as Temporal.ZonedDateTime).epochMilliseconds).toISOString(),
				description: calendarEvent.description || null,
				where: calendarEvent.location || null,
				color: calendarEvent.calendarId || calendarColors.skyline,
			};
		}

		fetcher.submit({
			type: 'updateEvent',
			eventId,
			eventTitle: updatedEvent.title ?? existingData.title ?? '',
			startDate: updatedEvent.start ?? existingData.start ?? '',
			endDate: updatedEvent.end ?? existingData.end ?? '',
			eventDescription: updatedEvent.description ?? existingData.description ?? '',
			eventLocation: updatedEvent.where ?? existingData.where ?? '',
			eventColor: updatedEvent.color ?? existingData.color ?? calendarColors.skyline,
		}, { method: 'post' });
	}, [fetcher]);

	const handleDateClick = useCallback((date: Temporal.PlainDate) => {
		const dateStr = date.toString();

		setSelectedEvent({
			start: dateStr + 'T09:00:00',
			end: dateStr + 'T10:00:00',
		});

		setModalOpen('createEvent');
	}, []);

	const handleEventClick = useCallback((eventId: string) => {
		const calendarEvent = calendarRef.current?.events.get(eventId);
		if (!calendarEvent) return;

		const startIso = new Date((calendarEvent.start as Temporal.ZonedDateTime).epochMilliseconds).toISOString();
		const endIso = new Date((calendarEvent.end as Temporal.ZonedDateTime).epochMilliseconds).toISOString();

		const eventData: Partial<CalendarEvent> = {
			id: String(calendarEvent.id),
			title: calendarEvent.title,
			start: startIso,
			end: endIso,
			description: calendarEvent.description || null,
			where: calendarEvent.location || null,
			color: calendarEvent.calendarId || calendarColors.skyline,
		};

		setSelectedEvent(eventData);

		const isHoliday = holidayIdsRef.current.has(String(calendarEvent.id));
		const modalType = isHoliday ? 'viewHoliday' : 'viewEvent';

		setModalOpen(modalType);
	}, []);

	const createEvent = useCallback((dateTime?: Temporal.ZonedDateTime) => {
		if (!dateTime) dateTime = Temporal.ZonedDateTime.from(Temporal.Now.zonedDateTimeISO());
		const { start: startISO, end: endISO } = closest15MinuteCreate(dateTime);

		handleEventCreate({
			start: startISO,
			end: endISO,
			title: 'New Event',
		});
	}, [handleEventCreate]);

	const calendar = useCalendarApp({
		views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
		selectedDate: Temporal.Now.plainDateISO(),
		calendars: colorCalendars,
		defaultView: 'month-grid',
		events: [],
		isDark,
		plugins: [
			calendarControlsPlugin,
			resizePlugin,
			dragAndDropPlugin,
			eventsService,
		],
		callbacks: {
			onClickDate: handleDateClick,
			onClickDateTime: createEvent,
			onSelectedDateUpdate: setCurrentDate,
			onEventClick: (event) => handleEventClick(String(event.id)),
			onBeforeEventUpdate: (_, newEvent) => !holidayIdsRef.current.has(String(newEvent.id)),
			isCalendarSmall: () => isMobile,

			onEventUpdate: (updatedEvent) => {
				const startIso = new Date((updatedEvent.start as Temporal.ZonedDateTime).epochMilliseconds).toISOString();
				const endIso = new Date((updatedEvent.end as Temporal.ZonedDateTime).epochMilliseconds).toISOString();

				const originalState = originalEventStateRef.current.get(String(updatedEvent.id));

				if (!originalState) {
					handleEventUpdate(String(updatedEvent.id), {
						title: updatedEvent.title,
						start: startIso,
						end: endIso,
						description: updatedEvent.description || null,
						where: updatedEvent.location || null,
					});
				} else {
					const updatedEventData: Partial<CalendarEvent> = {};
					if (originalState.start !== startIso) updatedEventData.start = startIso;
					if (originalState.end !== endIso) updatedEventData.end = endIso;
					if (originalState.title !== updatedEvent.title) updatedEventData.title = updatedEvent.title;
					if (originalState.description !== (updatedEvent.description || null)) updatedEventData.description = updatedEvent.description || null;
					if (originalState.where !== (updatedEvent.location || null)) updatedEventData.where = updatedEvent.location || null;

					if (Object.keys(updatedEventData).length > 0) {
						handleEventUpdate(String(updatedEvent.id), updatedEventData);
					}
				}
			},
		},
	});

	calendarRef.current = calendar;

	const setCurrentView = useCallback((view: CalendarView) => {
		if (!calendar) return;
		setCurrentViewOriginal(view);
		calendarControlsPlugin.setView(view);
	}, [calendarControlsPlugin, calendar]);

	const handleButton = useCallback((direction: 'prev' | 'next') => {
		if (!calendar) return;
		const tempCurrentView = currentView === 'month-grid' ? 'month' : currentView;
		calendarControlsPlugin.setDate(direction === 'prev' ? currentDate.subtract({ [`${tempCurrentView}s`]: 1 }) : currentDate.add({ [`${tempCurrentView}s`]: 1 }));
	}, [currentDate, calendar, currentView, calendarControlsPlugin]);

	const handleDeleteEvent = useCallback(() => {
		if (selectedEvent?.id) {
			fetcher.submit({ type: 'deleteEvent', eventId: selectedEvent.id }, { method: 'post' });
			setShowDeleteConfirm(false);
		}
	}, [selectedEvent, fetcher]);

	const handleCountrySave = useCallback((countryCode: string | null) => {
		fetcher.submit({ type: 'updateCountryCode', countryCode: countryCode || '' }, { method: 'post' });
		setShowCountryModal(false);
	}, [fetcher]);

	useHotkeys(['A', 'D', 'W', 'S', 'N'], (k) => {
		switch (k) {
			case 'A': handleButton('prev'); break;
			case 'D': handleButton('next'); break;
			case 'W': setCurrentView(currentView === 'day' ? 'week' : currentView === 'week' ? 'month-grid' : 'day'); break;
			case 'S': setCurrentView(currentView === 'month-grid' ? 'week' : currentView === 'week' ? 'day' : 'month-grid'); break;
			case 'N': createEvent(); break;
		}
	}, isAnyModalOpen);

	const hasInitializedRef = useRef(false);

	useEffect(() => {
		if (!calendar) return;

		const currentEvents = calendar.events.getAll();
		const stateMap = new Map<string, CalendarEvent>();

		for (const event of currentEvents) {
			stateMap.set(String(event.id), {
				id: String(event.id),
				start: new Date((event.start as Temporal.ZonedDateTime).epochMilliseconds).toISOString(),
				end: new Date((event.end as Temporal.ZonedDateTime).epochMilliseconds).toISOString(),
				title: event.title || '',
				description: event.description || null,
				where: event.location || null,
				color: event.calendarId || calendarColors.skyline,
			});
		}

		originalEventStateRef.current = stateMap;
	}, [calendar, initialEvents, initialHolidays]);

	useEffect(() => {
		if (!calendar) return;

		const formatSingleEvent = (event: CalendarEvent | Jsonify<FormattedHoliday>): CalendarEventExternal => ({
			id: event.id,
			title: event.title,
			start: Temporal.Instant.fromEpochMilliseconds(Date.parse(event.start)).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
			end: Temporal.Instant.fromEpochMilliseconds(Date.parse(event.end)).toZonedDateTimeISO(Temporal.Now.timeZoneId()),
			location: 'where' in event ? event.where || undefined : undefined,
			description: event.description || undefined,
			calendarId: event.color,
			_options: 'types' in event ? { disableDND: true, disableResize: true } : {},
		});

		const formattedHolidays = initialHolidays.map(formatSingleEvent);

		holidayIdsRef.current = new Set(initialHolidays.map((h) => h.id));

		if (!hasInitializedRef.current) {
			const formattedEvents = initialEvents.map(formatSingleEvent);
			const allEvents = [...formattedEvents, ...formattedHolidays];
			calendar.events.set(allEvents);
			hasInitializedRef.current = true;
		} else {
			const currentCalendarEvents = calendar.events.getAll();
			const serverEventIds = new Set(initialEvents.map((e) => e.id));
			const holidayIds = new Set(initialHolidays.map((h) => h.id));

			const newLocalEvents = currentCalendarEvents.filter((ce) => !serverEventIds.has(String(ce.id)) && !holidayIds.has(String(ce.id)));

			const formattedEvents = initialEvents.map(formatSingleEvent);
			const allEvents = [...formattedEvents, ...formattedHolidays, ...newLocalEvents];

			calendar.events.set(allEvents);
		}
	}, [calendar, initialEvents, initialHolidays]);

	useEffect(() => { calendar?.setTheme(isDark ? 'dark' : 'light'); }, [isDark, calendar]);

	useEffect(() => {
		if (!calendar || !calendarControlsPlugin) return;

		const timeout = setTimeout(() => {
			calendarControlsPlugin.setView('month-grid');
			setCurrentViewOriginal('month-grid');
		}, 50);

		return () => clearTimeout(timeout);
	}, [calendar, calendarControlsPlugin]);

	return (
		<VStack w='100%' align='center' px={0} spacing={0} h='100vh'>
			<Flex direction='column' w='100%' h='100%' overflow='hidden'>
				<CalendarHeader
					groupName={group.name}
					currentDate={currentDate}
					currentView={currentView}
					onToday={() => setCurrentDate(Temporal.Now.plainDateISO())}
					handleButton={handleButton}
					onViewChange={setCurrentView}
					onCreateEvent={handleEventCreate}
					onCountrySettings={() => setShowCountryModal(true)}
				/>

				<Box w='100%' flex='1' minH='0' overflow='auto'>
					<ScheduleXCalendar calendarApp={calendar} />
				</Box>

				<ManageEvent
					isOpen={modalOpen !== null}
					onClose={() => {
						setModalOpen(null);
						setSelectedEvent(null);
					}}
					fetcher={fetcher}
					eventId={selectedEvent?.id}
					type={modalOpen || 'createEvent'}
					selectedDate={currentDate.toString()}
					defaultEvent={selectedEvent || undefined}
					canEdit={canEdit(group.accessLevel)}
					onDelete={() => setShowDeleteConfirm(true)}
					onEdit={() => {
						if (selectedEvent) setModalOpen('updateEvent');
					}}
				/>

				<ConfirmModal
					title='Delete Event'
					isOpen={showDeleteConfirm}
					onConfirm={handleDeleteEvent}
					onClose={() => setShowDeleteConfirm(false)}
					message={`Are you sure you want to delete "${selectedEvent?.title}"? This action cannot be undone.`}
					isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
					confirmText='Delete'
					colorScheme='red'
				/>

				<CountryCodeModal
					isOpen={showCountryModal}
					onSave={handleCountrySave}
					canManage={canManage(group.accessLevel)}
					currentCountryCode={group.calendarCode}
					onClose={() => setShowCountryModal(false)}
					isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
				/>
			</Flex>
		</VStack>
	);
}
