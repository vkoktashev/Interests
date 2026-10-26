import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {openModal} from '@steroidsjs/core/actions/modal';
import {MdAddReaction} from 'react-icons/md';
import LoginForm from '../../../../../modals/LoginForm';
import ReactionPill from './ReactionPill';
import './log-reactions.scss';

const REACTIONS = [
    {
        emoji: '👍',
        label: 'Нравится',
    },
    {
        emoji: '❤️',
        label: 'Любовь',
    },
    {
        emoji: '🔥',
        label: 'Огонь',
    },
    {
        emoji: '😂',
        label: 'Смешно',
    },
    {
        emoji: '😮',
        label: 'Удивление',
    },
    {
        emoji: '😢',
        label: 'Грусть',
    },
    {
        emoji: '👏',
        label: 'Аплодисменты',
    },
    {
        emoji: '🤔',
        label: 'Задумался',
    },
    {
        emoji: '💩',
        label: 'Какашка',
    },
    {
        emoji: '🤮',
        label: 'Тошнит',
    },
];

interface ILogReaction {
    emoji: string,
    count: number,
    selected: boolean,
}

interface ILogReactionsProps {
    log: {
        id: number,
        type: string,
        reactions?: ILogReaction[],
    },
}

function LogReactions({log}: ILogReactionsProps) {
    const bem = useBem('log-reactions');
    const {http} = useComponents();
    const dispatch = useDispatch();
    const user = useSelector(getUser);
    const pickerId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const savingRef = useRef(false);
    const [reactions, setReactions] = useState<ILogReaction[]>(log.reactions || []);
    const [isOpen, setOpen] = useState(false);
    const [usersEmoji, setUsersEmoji] = useState<string | null>(null);
    const [isSaving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [position, setPosition] = useState<{left: number, top: number,} | null>(null);

    useEffect(() => {
        if (!savingRef.current) {
            setReactions(log.reactions || []);
        }
    }, [log.reactions]);

    useLayoutEffect(() => {
        if (!isOpen || !pickerRef.current || !triggerRef.current) {
            return;
        }
        const anchor = triggerRef.current.getBoundingClientRect();
        const picker = pickerRef.current.getBoundingClientRect();
        const top = anchor.top >= picker.height + 20
            ? anchor.top - picker.height - 8
            : anchor.bottom + 8;
        setPosition({
            left: Math.max(12, Math.min(anchor.left, window.innerWidth - picker.width - 12)),
            top: Math.max(12, Math.min(top, window.innerHeight - picker.height - 12)),
        });
        const selectedButton = pickerRef.current.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
        (selectedButton || pickerRef.current.querySelector('button'))?.focus({preventScroll: true});
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!rootRef.current?.contains(target) && !pickerRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };
        const onViewportChange = () => setOpen(false);
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [isOpen]);

    const requireLogin = () => {
        if (user?.id) {
            return false;
        }
        dispatch(openModal(LoginForm));
        return true;
    };

    const onReact = async (emoji: string) => {
        if (savingRef.current || requireLogin()) {
            return;
        }
        const previous = reactions;
        const nextEmoji = reactions.some(reaction => reaction.emoji === emoji && reaction.selected) ? null : emoji;
        const optimistic = REACTIONS.map(option => {
            const current = reactions.find(reaction => reaction.emoji === option.emoji);
            const selected = option.emoji === nextEmoji;
            return {
                emoji: option.emoji,
                count: (current?.count || 0) - Number(!!current?.selected) + Number(selected),
                selected,
            };
        }).filter(reaction => reaction.count > 0);
        savingRef.current = true;
        setSaving(true);
        setError('');
        setReactions(optimistic);
        if (isOpen) {
            setOpen(false);
            triggerRef.current?.focus();
        }
        try {
            const response = await http.send('PUT', '/users/user/log_reaction/', {
                type: log.type,
                id: log.id,
                emoji: nextEmoji,
            });
            setReactions(response.data.reactions);
        } catch (e) {
            setReactions(previous);
            setError('Не удалось сохранить реакцию. Попробуйте ещё раз.');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <div
            ref={rootRef}
            className={bem.block({
                empty: reactions.length === 0,
                users: Boolean(usersEmoji),
            })}
        >
            <div
                className={bem.element('list')}
                role='group'
                aria-label='Реакции на действие'
                aria-busy={isSaving}
            >
                {reactions.map(reaction => (
                    <ReactionPill
                        key={reaction.emoji}
                        logId={log.id}
                        logType={log.type}
                        reaction={reaction}
                        disabled={isSaving}
                        onReact={onReact}
                        isOpen={usersEmoji === reaction.emoji}
                        onOpen={() => {
                            setOpen(false);
                            setUsersEmoji(reaction.emoji);
                        }}
                        onClose={() => setUsersEmoji(current => current === reaction.emoji ? null : current)}
                    />
                ))}
                <button
                    ref={triggerRef}
                    type='button'
                    className={bem.element('add', {open: isOpen})}
                    aria-label='Выбрать реакцию'
                    title='Выбрать реакцию'
                    aria-expanded={isOpen}
                    aria-controls={isOpen ? pickerId : undefined}
                    aria-haspopup='dialog'
                    disabled={isSaving}
                    onClick={() => {
                        if (requireLogin()) {
                            return;
                        }
                        setPosition(null);
                        setUsersEmoji(null);
                        setOpen(!isOpen);
                    }}
                >
                    <MdAddReaction aria-hidden='true' />
                </button>
            </div>
            <div
                className={bem.element('quick-picker')}
                role='group'
                aria-label='Выбрать реакцию'
                aria-busy={isSaving}
            >
                {REACTIONS.map(option => (
                    <button
                        key={option.emoji}
                        type='button'
                        className={bem.element('quick-option', {
                            selected: reactions.some(reaction => reaction.emoji === option.emoji && reaction.selected),
                        })}
                        aria-label={option.label}
                        aria-pressed={reactions.some(reaction => reaction.emoji === option.emoji && reaction.selected)}
                        title={option.label}
                        disabled={isSaving}
                        onClick={() => onReact(option.emoji)}
                    >
                        <span aria-hidden='true'>{option.emoji}</span>
                    </button>
                ))}
            </div>
            {error && (
                <div
                    className={bem.element('error')}
                    role='alert'
                >
                    {error}
                </div>
            )}
            {isOpen && createPortal(
                <div
                    ref={pickerRef}
                    id={pickerId}
                    role='dialog'
                    aria-label='Выбрать реакцию'
                    className={bem.element('picker')}
                    style={position || {visibility: 'hidden'}}
                    onBlur={event => {
                        const target = event.relatedTarget as Node;
                        if (!event.currentTarget.contains(target) && !rootRef.current?.contains(target)) {
                            setOpen(false);
                        }
                    }}
                >
                    {REACTIONS.map(option => (
                        <button
                            key={option.emoji}
                            type='button'
                            className={bem.element('option', {
                                selected: reactions.some(reaction => reaction.emoji === option.emoji && reaction.selected),
                            })}
                            aria-label={option.label}
                            aria-pressed={reactions.some(reaction => reaction.emoji === option.emoji && reaction.selected)}
                            title={option.label}
                            onClick={() => onReact(option.emoji)}
                        >
                            <span aria-hidden='true'>{option.emoji}</span>
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}

export default LogReactions;
