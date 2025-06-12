import { Select as ChakraSelect, GroupBase, OptionsOrGroups } from 'chakra-react-select';
import { useColorMode } from '@chakra-ui/react';

export type SelectProps<Option, IsMulti extends boolean, Group extends GroupBase<Option>> = {
	placeholder?: string;
	defaultValue?: PropsValue<Option>;
	options: OptionsOrGroups<Option, Group>;
	isMulti?: IsMulti;
	onChange?: (e: OnChangeValue<Option, IsMulti>) => void;
} & Omit<React.ComponentProps<typeof ChakraSelect>, 'placeholder' | 'defaultValue' | 'options' | 'onChange' | 'isMulti' | 'chakraStyles'>;

export default function Select<
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>
>({
	placeholder,
	defaultValue,
	options,
	isMulti,
	onChange,
	...props
}: SelectProps<Option, IsMulti, Group>) {
	const { colorMode } = useColorMode();

	return (
		<ChakraSelect
			id={props.id || 'select'}
			instanceId={props.id || 'select'}
			defaultValue={defaultValue}
			placeholder={placeholder}
			isMulti={isMulti}
			options={options}
			onChange={(e) => onChange?.(e as OnChangeValue<Option, IsMulti>)}
			selectedOptionStyle='check'
			chakraStyles={{
				container: (styles) => ({
					...styles,
					width: '100%',
					cursor: 'pointer',
				}),
				control: (styles) => ({
					...styles,
					width: '100%',
				}),
				menuList: (styles) => ({
					...styles,
					backgroundColor: colorMode === 'dark' ? 'brand800' : 'white',
					boxShadow: 'md',
					minW: 0,
				}),
				menu: (styles) => ({
					...styles,
					backgroundColor: colorMode === 'dark' ? 'brand800' : 'white',
					width: '100%',
				}),
				option: (styles) => ({
					...styles,
					backgroundColor: colorMode === 'dark' ? 'brand600' : 'white',
					_hover: { backgroundColor: colorMode === 'dark' ? 'alpha200' : 'gray.200' },
					_active: { backgroundColor: colorMode === 'dark' ? 'brand800' : 'white' },
				}),
				groupHeading: (styles) => ({
					...styles,
					backgroundColor: colorMode === 'dark' ? 'brand800' : 'white',
				}),
			}}
			{...props}
		/>
	);
}

export declare type SingleValue<Option> = Option | null;
export declare type MultiValue<Option> = readonly Option[];
export declare type PropsValue<Option> = MultiValue<Option> | SingleValue<Option>;
export declare type OnChangeValue<Option, IsMulti extends boolean> = IsMulti extends true ? MultiValue<Option> : SingleValue<Option>;
