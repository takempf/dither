import type { PageLoad } from './$types';

// the route only matches with a roomId, so no missing-param check is needed
export const load: PageLoad = ({ params }) => ({ roomId: params.roomId });
