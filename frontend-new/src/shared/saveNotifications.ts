import {showNotification} from '@steroidsjs/core/actions/notifications';

export const savedNotification = () => showNotification('Сохранено', 'success', {
    position: 'top-right',
    timeOut: 1000,
});

export const saveFailedNotification = () => showNotification('Не удалось сохранить', 'danger');
