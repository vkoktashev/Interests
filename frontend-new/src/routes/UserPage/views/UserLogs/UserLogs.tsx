import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import LogsBlock from '../LogsBlock';
import {useCallback, useState} from 'react';
import {useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {formSubmit} from '@steroidsjs/core/actions/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';

interface IUserLogsProps {
    className?: string,
    userId: number,
}

const USER_LOGS_FORM = 'user_logs_form';

function UserLogs(props: IUserLogsProps) {
    const bem = useBem('UserLogs');
    const {http} = useComponents();
    const dispatch = useDispatch();
    const [logs, setLogs] = useState<any>({count: 0, log: []});

    const requestUserLogs = useCallback(async (values) => {
        const response = await http.get(`/users/user/${props.userId}/log/`, values);
        setLogs(response);
    }, []);

    const onDeleteLog = useCallback((logType: string, logId: number) => {
        http.delete(`/users/user/${props.userId}/log/`, { type: logType, id: logId })
            .catch(e => {
                dispatch(showNotification('Не удалось удалить лог', 'danger'));
            })
            .finally(() => {
                dispatch(formSubmit(USER_LOGS_FORM));
            });
    }, []);

    return (
        <LogsBlock
            className={bem(bem.block(), props.className)}
            formId={USER_LOGS_FORM}
            logs={logs}
            onDeleteLog={onDeleteLog}
            onFormSubmit={requestUserLogs}
        />
    );
}

export default UserLogs;
