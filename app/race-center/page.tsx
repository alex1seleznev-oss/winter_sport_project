import {permanentRedirect} from 'next/navigation';
// Remove a second, incomplete event listing; individual /race-center/[id] URLs stay unchanged.
export default function RaceCenter(){permanentRedirect('/calendar')}
