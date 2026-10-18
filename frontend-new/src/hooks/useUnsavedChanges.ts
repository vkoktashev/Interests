import {useCallback, useEffect, useRef} from 'react';
import {useHistory} from 'react-router-dom';

const MESSAGE = 'Есть несохранённые изменения. Если уйти со страницы, они будут потеряны. Уйти без сохранения?';
export const STATUS_RESET_MESSAGE = 'Есть несохранённые изменения. Если сменить статус, они будут потеряны. Продолжить?';
const guards = new Set<{current: boolean}>();
let stopBlocking: (() => void) | undefined;

function hasChanges() {
    return Array.from(guards).some(guard => guard.current);
}

function onBeforeUnload(event: BeforeUnloadEvent) {
    if (hasChanges()) {
        event.preventDefault();
        event.returnValue = '';
    }
}

export default function useUnsavedChanges(isDirty: boolean) {
    const history = useHistory();
    const dirty = useRef(isDirty);
    dirty.current = isDirty;

    useEffect(() => {
        guards.add(dirty);
        if (!stopBlocking) {
            stopBlocking = history.block(() => hasChanges() ? MESSAGE : undefined);
            window.addEventListener('beforeunload', onBeforeUnload);
        }
        return () => {
            guards.delete(dirty);
            if (guards.size === 0) {
                stopBlocking?.();
                stopBlocking = undefined;
                window.removeEventListener('beforeunload', onBeforeUnload);
            }
        };
    }, [history]);

    // Clear synchronously before navigating after a successful save.
    return useCallback(() => { dirty.current = false; }, []);
}
