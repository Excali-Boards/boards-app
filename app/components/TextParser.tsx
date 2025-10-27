import { Text, TextProps } from '@chakra-ui/react';
import pkg from 'katex';

export type TextParserProps = {
	children: string | string[];
} & TextProps;

export function TextParser({ children, ...props }: TextParserProps) {
	const content = Array.isArray(children) ? children.join('\n\n') : children;

	const renderMath = (expr: string) => {
		const normalized = expr.replace(/ /g, '\\;');
		const html = pkg.renderToString(normalized, { throwOnError: false, strict: false });
		return <Text as='span' {...props} dangerouslySetInnerHTML={{ __html: html }} />;
	};

	const parseInline = (text: string) => {
		return text.split(/(\$[^$]*\$)/g).map((segment, i) => {
			if (segment.startsWith('$') && segment.endsWith('$')) {
				return <span key={i}>{renderMath(segment.slice(1, -1))}</span>;
			}

			return segment.split('\n').map((line, j) => (
				<span key={`${i}-${j}`}>
					{line && <Text as='span' m={0} p={0} {...props}>{line}</Text>}
					{j < segment.split('\n').length - 1 && <br />}
				</span>
			));
		});
	};

	return <>{parseInline(content)}</>;
}
