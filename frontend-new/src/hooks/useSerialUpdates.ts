import {useCallback, useEffect, useRef} from 'react';
import {useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {saveFailedNotification, savedNotification} from '../shared/saveNotifications';

type Payload = Record<string, any>;
type MergePayload = (current: Payload, next: Payload) => Payload;
type PayloadToFields = (payload: Payload) => Payload;

export interface ISerialUpdatesResult {
    // Response of the last successful request of the burst, if any succeeded
    data?: any,
    failed: boolean,
}

interface IWaiter {
    resolve: (data: any) => void,
    reject: (error: any) => void,
}

interface IQueue {
    pending: {
        payload: Payload,
        waiters: IWaiter[],
    } | null,
    inFlightPayload: Payload | null,
    burstNotify: boolean,
    burstFields: Set<string>,
    burstData?: any,
    burstFailed: boolean,
    listeners: Set<(result: ISerialUpdatesResult, fields: string[]) => void>,
}

// Queues live outside components so that leaving the page and coming back
// does not start a second, parallel request for the same record.
const queues = new Map<string, IQueue>();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', event => {
        if (Array.from(queues.values()).some(queue => queue.pending || queue.inFlightPayload)) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
}

function getQueue(key: string) {
    if (!queues.has(key)) {
        queues.set(key, {
            pending: null,
            inFlightPayload: null,
            burstNotify: false,
            burstFields: new Set(),
            burstFailed: false,
            listeners: new Set(),
        });
    }
    return queues.get(key);
}

function releaseQueue(key: string, queue: IQueue) {
    if (!queue.pending && !queue.inFlightPayload && queue.listeners.size === 0) {
        queues.delete(key);
    }
}

const shallowMerge: MergePayload = (current, next) => ({
    ...current,
    ...next,
});

const identityFields: PayloadToFields = payload => payload;

export function mergeEpisodesPayload(current: Payload, next: Payload) {
    const episodes = new Map<string, any>(current.episodes.map(item => [String(item.tmdb_id), item]));
    next.episodes.forEach(item => {
        const id = String(item.tmdb_id);
        episodes.set(id, {
            ...episodes.get(id),
            ...item,
        });
    });
    return {
        ...current,
        ...next,
        episodes: Array.from(episodes.values()),
    };
}

async function flush(key: string, url: string, queue: IQueue, http: any, dispatch: any) {
    if (queue.inFlightPayload || !queue.pending) {
        return;
    }
    const {payload, waiters} = queue.pending;
    queue.pending = null;
    queue.inFlightPayload = payload;
    try {
        const response = await http.send('PUT', url, payload);
        queue.burstData = response.data;
        queue.burstFailed = false;
        waiters.forEach(waiter => waiter.resolve(response.data));
    } catch (error) {
        queue.burstFailed = true;
        waiters.forEach(waiter => waiter.reject(error));
    } finally {
        queue.inFlightPayload = null;
    }

    if (queue.pending) {
        flush(key, url, queue, http, dispatch);
        return;
    }
    const result = {
        data: queue.burstData,
        failed: queue.burstFailed,
    };
    const fields = Array.from(queue.burstFields);
    if (queue.burstNotify) {
        dispatch(result.failed ? saveFailedNotification() : savedNotification());
    }
    queue.burstData = undefined;
    queue.burstFailed = false;
    queue.burstNotify = false;
    queue.burstFields = new Set();
    queue.listeners.forEach(listener => listener(result, fields));
    releaseQueue(key, queue);
}

interface ISerialUpdatesOptions {
    // Queue identity; defaults to url. Updates with the same key never run in parallel.
    key?: string,
    merge?: MergePayload,
    // Maps a request payload to the record fields it changes
    toFields?: PayloadToFields,
    // Called once the queue drains, so the page can apply the server state
    onSettled?: (result: ISerialUpdatesResult) => void,
}

export default function useSerialUpdates(url: string, options: ISerialUpdatesOptions = {}) {
    const {key = url, merge = shallowMerge, toFields = identityFields, onSettled} = options;
    const {http} = useComponents();
    const dispatch = useDispatch();
    const onSettledRef = useRef(onSettled);
    onSettledRef.current = onSettled;
    const toFieldsRef = useRef(toFields);
    toFieldsRef.current = toFields;
    // Fields this page has changed: from then on their values come from the page and onSettled, not from a GET
    const ownFields = useRef(new Set<string>());

    useEffect(() => {
        ownFields.current = new Set();
        const queue = getQueue(key);
        const listener = (result: ISerialUpdatesResult, fields: string[]) => {
            fields.forEach(field => ownFields.current.add(field));
            onSettledRef.current?.(result);
        };
        queue.listeners.add(listener);
        return () => {
            queue.listeners.delete(listener);
            releaseQueue(key, queue);
        };
    }, [key]);

    const sendUpdate = useCallback((payload: Payload, {notify = false} = {}) => new Promise<any>((resolve, reject) => {
        const queue = getQueue(key);
        Object.keys(toFieldsRef.current(payload)).forEach(field => {
            ownFields.current.add(field);
            queue.burstFields.add(field);
        });
        queue.burstNotify = queue.burstNotify || notify;
        queue.pending = {
            payload: queue.pending ? merge(queue.pending.payload, payload) : payload,
            waiters: [...(queue.pending?.waiters || []), {
                resolve,
                reject,
            }],
        };
        flush(key, url, queue, http, dispatch);
    }), [key, url, merge, http, dispatch]);

    // A GET snapshot may have been read before the updates were committed. So it only fills fields
    // this page has not changed, and fields still being saved show their unsaved values.
    const pickFromSnapshot = useCallback((snapshot: Payload) => {
        const queue = queues.get(key);
        const unsaved = [queue?.inFlightPayload, queue?.pending?.payload]
            .filter(Boolean)
            .reduce((result, payload) => ({
                ...result,
                ...toFieldsRef.current(payload),
            }), {});
        return Object.keys(snapshot).reduce((result, field) => {
            if (field in unsaved) {
                result[field] = unsaved[field];
            } else if (!ownFields.current.has(field)) {
                result[field] = snapshot[field];
            }
            return result;
        }, {} as Payload);
    }, [key]);

    return {
        sendUpdate,
        pickFromSnapshot,
    };
}
