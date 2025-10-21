import { Flex, Button, Text, IconButton, HStack, useColorMode, Menu, MenuButton, MenuList, MenuItem, Portal, useBreakpointValue } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, AddIcon, SettingsIcon } from '@chakra-ui/icons';
import { BsCalendarWeek, BsCalendarMonth, BsCalendar3 } from 'react-icons/bs';
import 'temporal-polyfill/global';
import { useMemo } from 'react';

export type CalendarView = 'day' | 'week' | 'month-grid';

export type CalendarHeaderProps = {
	groupName: string;
	currentDate: Temporal.PlainDate;
	currentView: CalendarView;
	handleButton: (date: 'prev' | 'next') => void;
	onViewChange: (view: CalendarView) => void;
	onCreateEvent: () => void;
	onToday: () => void;
	onCountrySettings: () => void;
};

const viewOptions = [
	{ value: 'day' as CalendarView, label: 'Day', icon: BsCalendar3 },
	{ value: 'week' as CalendarView, label: 'Week', icon: BsCalendarWeek },
	{ value: 'month-grid' as CalendarView, label: 'Month', icon: BsCalendarMonth },
];

export function CalendarHeader({
	groupName,
	currentDate,
	currentView,
	handleButton,
	onViewChange,
	onCreateEvent,
	onToday,
	onCountrySettings,
}: CalendarHeaderProps) {
	const { colorMode } = useColorMode();
	const isMobile = useBreakpointValue({ base: true, md: false });

	const formattedDate = useMemo(() => {
		const formatter = new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: currentView === 'day' ? 'numeric' : undefined,
		});

		return formatter.format(new Date(currentDate.toString()));
	}, [currentDate, currentView]);

	const currentViewOption = viewOptions.find((option) => option.value === currentView) || viewOptions[2]!;

	if (isMobile) {
		return (
			<Flex direction='column' p={3} gap={4}>
				<HStack spacing={2} justify='center' w='100%' flexWrap='wrap'>
					<IconButton
						aria-label='Today'
						icon={<BsCalendar3 />}
						variant='outline'
						onClick={onToday}
					/>
					<IconButton
						aria-label='Previous'
						icon={<ChevronLeftIcon />}
						variant='outline'
						onClick={() => handleButton('prev')}
					/>
					<IconButton
						aria-label='Next'
						icon={<ChevronRightIcon />}
						variant='outline'
						onClick={() => handleButton('next')}
					/>
					<IconButton
						aria-label='Country Settings'
						icon={<SettingsIcon />}
						variant='outline'
						onClick={onCountrySettings}
					/>
					<IconButton
						aria-label={`${currentViewOption.label} view`}
						icon={<currentViewOption.icon />}
						variant='outline'
						onClick={() => {
							const currentIndex = viewOptions.findIndex((v) => v.value === currentView);
							const nextIndex = (currentIndex + 1) % viewOptions.length;
							onViewChange(viewOptions[nextIndex]!.value);
						}}
					/>
					<IconButton
						aria-label='Create Event'
						icon={<AddIcon />}
						variant='solid'
						onClick={onCreateEvent}
					/>
				</HStack>

				<Text
					fontSize='lg'
					fontWeight='semibold'
					textAlign='center'
					w='100%'
				>
					{groupName} - {formattedDate}
				</Text>
			</Flex>
		);
	}

	return (
		<Flex
			p={4}
			justify='space-between'
			align='center'
			position='relative'
		>
			<HStack spacing={2} minW='200px' zIndex={1}>
				<Button variant='outline' size='sm' onClick={onToday}>
					Today
				</Button>
				<HStack spacing={1}>
					<IconButton
						aria-label='Previous'
						icon={<ChevronLeftIcon />}
						size='sm'
						variant='outline'
						onClick={() => handleButton('prev')}
					/>
					<IconButton
						aria-label='Next'
						icon={<ChevronRightIcon />}
						size='sm'
						variant='outline'
						onClick={() => handleButton('next')}
					/>
				</HStack>
			</HStack>

			<Text
				fontSize='xl'
				fontWeight='semibold'
				position='absolute'
				left='50%'
				top='50%'
				transform='translate(-50%, -50%)'
				textAlign='center'
				minW='200px'
				pointerEvents='none'
			>
				{groupName} - {formattedDate}
			</Text>

			<HStack spacing={2} minW='200px' justify='flex-end' zIndex={1}>
				<IconButton
					aria-label='Country Settings'
					icon={<SettingsIcon />}
					variant='outline'
					onClick={onCountrySettings}
				/>

				<Menu>
					<MenuButton
						as={Button}
						variant='outline'
						data-calendar-view-menu
						leftIcon={<currentViewOption.icon />}
						sx={{
							backgroundColor: `${colorMode === 'dark' ? 'transparent' : 'white'} !important`,
							borderColor: `${colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.300'} !important`,
							color: `${colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800'} !important`,
							'&:hover': {
								backgroundColor: `${colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'} !important`,
								borderColor: `${colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400'} !important`,
							},
						}}
					>
						{currentViewOption.label}
					</MenuButton>
					<Portal>
						<MenuList
							zIndex={99999}
							sx={{
								backgroundColor: `${colorMode === 'dark' ? 'gray.800' : 'white'} !important`,
								borderColor: `${colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.200'} !important`,
								boxShadow: colorMode === 'dark' ? 'dark-lg' : 'lg',
							}}
						>
							{viewOptions.map((option) => {
								const IconComponent = option.icon;

								return (
									<MenuItem
										key={option.value}
										icon={<IconComponent />}
										onClick={() => onViewChange(option.value)}
										data-calendar-view-menu-item
										sx={{
											backgroundColor: `${option.value === currentView
												? (colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.100')
												: 'transparent'} !important`,
											color: `${colorMode === 'dark' ? 'whiteAlpha.900' : 'gray.800'} !important`,
											'&:hover': {
												backgroundColor: `${colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'} !important`,
											},
										}}
									>
										{option.label}
									</MenuItem>
								);
							})}
						</MenuList>
					</Portal>
				</Menu>

				<Button
					variant='solid'
					leftIcon={<AddIcon />}
					onClick={onCreateEvent}
				>
					Create Event
				</Button>
			</HStack>
		</Flex>
	);
}
