import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {Button} from '@steroidsjs/core/ui/form';
import './save-dock.scss';

interface ISaveDockProps {
    visible: boolean;
    isSaving: boolean;
    disabled?: boolean;
    error?: string;
    onSave: () => void;
    className?: string;
}

export default function SaveDock({visible, isSaving, disabled, error, onSave, className}: ISaveDockProps) {
    const bem = useBem('save-dock');
    if (!visible) {
        return null;
    }
    return (
        <div className={bem(bem.block(), className)} aria-busy={isSaving}>
            {error && <div className={bem.element('error')} role='alert'>{error}</div>}
            <Button
                className={bem.element('button')}
                type='button'
                disabled={isSaving || disabled}
                onClick={onSave}
            >
                {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
        </div>
    );
}
