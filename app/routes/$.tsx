import { LoaderFunctionArgs } from '@remix-run/node';
import { useLocation } from '@remix-run/react';
import InfoComponent from '~/components/Info';
import { Flex } from '@chakra-ui/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const error = url.searchParams.get('error');

	if (error || (code && url.pathname.startsWith('/err'))) return new Response(null, { status: 500 });
	return new Response(null, { status: 404 });
};

export default function ErrorPage() {
	const location = useLocation();
	const code = new URLSearchParams(location.search).get('code') || undefined;

	return (
		<Flex
			alignItems={'center'}
			justifyContent={'top'}
			flexDir={'column'}
			mt={'30vh'}
		>
			<InfoComponent
				title={code ? 'Something went wrong.' : undefined}
				text={code}
			/>
		</Flex>
	);
}
