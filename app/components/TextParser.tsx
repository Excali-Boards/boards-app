import { Text, Link, Code, TextProps } from '@chakra-ui/react';
import { themeColor } from '~/other/types';
import createDOMPurify from 'dompurify';
import React from 'react';
import katex from 'katex';

export type TextParserProps = {
	children: string | string[];
} & TextProps;

const DOMPurify = typeof window !== 'undefined' ? createDOMPurify(window) : null;

export function TextParser({ children, ...props }: TextParserProps) {
	const content = Array.isArray(children) ? children.join('\n\n') : children;

	const renderMath = (expr: string) => {
		const html = katex.renderToString(expr, { throwOnError: false, strict: false });
		const safeHtml = DOMPurify ? DOMPurify.sanitize(html) : html;

		return (
			<Text
				as='span'
				m={0} p={0}
				dangerouslySetInnerHTML={{ __html: safeHtml }}
				{...props}
			/>
		);
	};

	const parseInline = (text: string): React.ReactNode[] => {
		return text.split(/(\$[^$]+\$)/g).map((segment, i) => {
			if (segment.startsWith('$') && segment.endsWith('$')) {
				return <React.Fragment key={`math-${i}`}>{renderMath(segment.slice(1, -1))}</React.Fragment>;
			}

			const withLinks = segment.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, j) => {
				if (part.match(/^\[[^\]]+\]\([^)]+\)$/)) {
					const [, label, url] = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;

					return (
						<Link key={`link-${i}-${j}`} href={url} color={themeColor} isExternal _hover={{ textDecoration: 'underline' }}>
							{label}
						</Link>
					);
				}

				const withCode = part.split(/(`[^`]+`)/g).map((sub, k) => {
					if (sub.startsWith('`') && sub.endsWith('`')) {
						return (
							<Code
								key={`code-${i}-${j}-${k}`}
								fontSize='0.95em'
								colorScheme='gray'
								borderRadius='md'
							>
								{sub.slice(1, -1)}
							</Code>
						);
					}

					const withBoldItalic = sub
						.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g)
						.map((s, m) => {
							if (s.match(/^\*\*[^*]+\*\*$|^__[^_]+__$/)) {
								const text = s.slice(2, -2);

								return (
									<Text as='b' key={`bold-${i}-${j}-${k}-${m}`} {...props}>
										{text}
									</Text>
								);
							}

							if (s.match(/^\*[^*]+\*$|^_[^_]+_$/)) {
								const text = s.slice(1, -1);

								return (
									<Text as='i' key={`italic-${i}-${j}-${k}-${m}`} {...props}>
										{text}
									</Text>
								);
							}

							return s.split('\n').map((line, n) => (
								<React.Fragment key={`line-${i}-${j}-${k}-${m}-${n}`}>
									{line && (
										<Text as='span' m={0} p={0} {...props}>
											{line}
										</Text>
									)}

									{n < s.split('\n').length - 1 && <br />}
								</React.Fragment>
							));
						});

					return withBoldItalic;
				});

				return withCode;
			});

			return withLinks;
		});
	};

	return <>{parseInline(content).flat(Infinity)}</>;
}
