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
    variant?: 'button' | 'bar';
}

export default function SaveDock({
    visible,
    isSaving,
    disabled,
    error,
    onSave,
    className,
    variant = 'bar',
}: ISaveDockProps) {
    const bem = useBem('save-dock');
    if (!visible) {
        return null;
    }
    const isBar = variant === 'bar';
    return (
        <div className={bem(bem.block({bar: isBar}), className)} aria-busy={isSaving}>
            {error && <div className={bem.element('error')} role='alert'>{error}</div>}
            <div className={bem.element('panel')}>
                {isBar && (
                    <span className={bem.element('label')}>
                        {isSaving ? 'Сохраняем изменения…' : 'Есть несохранённые изменения'}
                    </span>
                )}
                <Button
                    className={bem.element('button')}
                    type='button'
                    disabled={isSaving || disabled}
                    onClick={onSave}
                >
                    {isSaving ? 'Сохраняем…' : 'Сохранить'}
                </Button>
            </div>
        </div>
    );
}
