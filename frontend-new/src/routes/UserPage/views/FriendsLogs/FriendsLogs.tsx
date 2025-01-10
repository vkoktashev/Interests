import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import LogsBlock from '../LogsBlock';
import {useCallback, useState} from 'react';
import {useComponents} from '@steroidsjs/core/hooks';

interface IUserLogsProps {
    className?: string,
    userId: number,
}

const USER_FRIENDS_LOGS_FORM = 'user_friends_logs_form';

function FriendsLogs(props: IUserLogsProps) {
    const bem = useBem('FriendsLogs');
    const {http} = useComponents();
    const [logs, setLogs] = useState<any>({count: 0, log: []});

    const requestUserLogs = useCallback(async (values) => {
        const response = await http.get(`api/users/user/friends_log/`, values);
        setLogs(response);
    }, []);

    const onDeleteLog = useCallback(() => {

    }, []);


    return (
        <LogsBlock
            className={bem(bem.block(), props.className)}
            formId={USER_FRIENDS_LOGS_FORM}
            logs={logs}
            onDeleteLog={onDeleteLog}
            onFormSubmit={requestUserLogs}
            showUsername
        />
    );
}

export default FriendsLogs;
