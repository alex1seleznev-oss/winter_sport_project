'use client';
import {useSelection} from './SelectionProvider';
export function SelectionRecovery(){const {mode,clear}=useSelection();if(mode!=='invalid')return null;return <button type="button" onClick={clear}>Удалить повреждённую локальную запись</button>}
