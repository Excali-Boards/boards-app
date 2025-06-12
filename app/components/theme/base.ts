import tokens from '~/components/theme/tokens';
import colors from '~/components/theme/colors';
import { extendTheme } from '@chakra-ui/react';

export default extendTheme({
	config: {
		useSystemColorMode: true,
		disableTransitionOnChange: false,
	},
	styles: {
		global: {
			body: {
				transitionProperty: 'background-color',
				transitionDuration: '0.4s',
			},
		},
	},
	colors,
	semanticTokens: tokens,
	components: {
		Tooltip: {
			baseStyle: {
				display: 'flex',
				borderRadius: 'lg',
				alignItems: 'center',
				justifyContent: 'center',
			},
		},
	},
});
