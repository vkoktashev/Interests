import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import LogsBlock from '../LogsBlock';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {formSubmit} from '@steroidsjs/core/actions/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {isSessionExpiredError} from '../../../../components/SafeJwtHttpComponent';
import {savedNotification} from '../../../../shared/saveNotifications';

interface IUserLogsProps {
    className?: string,
    userId: number,
    onLoad?: () => void,
}

const USER_LOGS_FORM = 'user_logs_form';

const getLogKey = (logType: string, logId: number) => `${logType}_${logId}`;

function UserLogs(props: IUserLogsProps) {
    const bem = useBem('UserLogs');
    const {http} = useComponents();
    const dispatch = useDispatch();
    const [logs, setLogs] = useState<any>({count: 0, log: [], compact_feed: false});
    const [deletedLogKeys, setDeletedLogKeys] = useState<Set<string>>(() => new Set());
    const deletedLogKeysRef = useRef<Set<string>>(new Set());
    const requestIdRef = useRef(0);
    const lastAppliedRef = useRef(0);

    const requestUserLogs = useCallback(async (values) => {
        const requestId = ++requestIdRef.current;
        const response = await http.get(`/users/user/${props.userId}/log/`, values);
        if (requestId > lastAppliedRef.current) {
            lastAppliedRef.current = requestId;
            setLogs(response);
            props.onLoad?.();
        }
    }, [props.onLoad]);

    const visibleLogs = useMemo(() => {
        const log = (logs.log || []).filter(item => !deletedLogKeys.has(getLogKey(item.type, item.id)));
        const hiddenCount = (logs.log?.length || 0) - log.length;
        return hiddenCount > 0
            ? {...logs, log, count: Math.max(0, Number(logs.count || 0) - hiddenCount)}
            : logs;
    }, [logs, deletedLogKeys]);

    const setLogDeleted = useCallback((key: string, isDeleted: boolean) => {
        const next = new Set(deletedLogKeysRef.current);
        if (isDeleted) {
            next.add(key);
        } else {
            next.delete(key);
        }
        deletedLogKeysRef.current = next;
        setDeletedLogKeys(next);
    }, []);

    const onDeleteLog = useCallback(async (logType: string, logId: number) => {
        const key = getLogKey(logType, logId);
        if (deletedLogKeysRef.current.has(key)) {
            return;
        }
        setLogDeleted(key, true);
        try {
            await http.delete(`/users/user/${props.userId}/log/`, {type: logType, id: logId});
            dispatch(savedNotification());
            dispatch(formSubmit(USER_LOGS_FORM));
        } catch (error) {
            setLogDeleted(key, false);
            if (!isSessionExpiredError(error))
                dispatch(showNotification('Не удалось удалить лог', 'error'));
        }
    }, [setLogDeleted]);

    return (
        <LogsBlock
            className={bem(bem.block(), props.className)}
            formId={USER_LOGS_FORM}
            logs={visibleLogs}
            onDeleteLog={onDeleteLog}
            onFormSubmit={requestUserLogs}
        />
    );
}

export default UserLogs;
