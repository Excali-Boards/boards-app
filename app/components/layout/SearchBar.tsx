import { Divider, Flex, Input, InputProps } from '@chakra-ui/react';
import { Fragment, useMemo } from 'react';

export type SearchBarProps = {
	search: string;
	setSearch: (search: string) => void;
	whatSearch: string;
	dividerMY?: number;
};

export function SearchBar({
	search,
	setSearch,
	whatSearch,
	dividerMY,
	...props
}: SearchBarProps & InputProps) {
	const searchBar = useMemo(() => {
		return (
			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				<Input
					{...props}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={`Search ${whatSearch}..`}
					_focus={{ bg: 'alpha200' }}
					variant={'filled'}
					bg={'alpha100'}
					rounded={'full'}
					px={4}
				/>
			</Flex>
		);
	}, [search, setSearch, whatSearch, props]);

	return dividerMY ? (
		<Fragment>
			<Divider my={dividerMY} />
			{searchBar}
			<Divider my={dividerMY} />
		</Fragment>
	) : (
		searchBar
	);
}
