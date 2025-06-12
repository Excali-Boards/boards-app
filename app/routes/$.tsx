import { LoaderFunctionArgs } from '@remix-run/node';
import { useLocation } from '@remix-run/react';
import InfoComponent from '~/components/Info';
import { Flex } from '@chakra-ui/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const query = new URLSearchParams(request.url.split('?')[1]);
	const code = query.get('code');

	if (code) return new Response(null, { status: 500 });
	else return new Response(null, { status: 404 });
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
