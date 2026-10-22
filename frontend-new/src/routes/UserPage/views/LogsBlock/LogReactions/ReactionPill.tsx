import React, {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_USER} from '../../../../index';
import {getDefaultAvatarUrl} from '../../../../../shared/avatar';
import './reaction-pill.scss';

interface IReactionUser {
    id: number,
    username: string,
    gender: 'male' | 'female' | null,
    reacted_at: string | null,
}

interface IReactionPillProps {
    logId: number,
    logType: string,
    reaction: {emoji: string, count: number, selected: boolean,},
    disabled: boolean,
    onReact: (emoji: string) => void,
    isOpen: boolean,
    onOpen: () => void,
    onClose: () => void,
}

function ReactionPill({logId, logType, reaction, disabled, onReact, isOpen, onOpen, onClose}: IReactionPillProps) {
    const bem = useBem('reaction-pill');
    const {http} = useComponents();
    const dispatch = useDispatch();
    const currentUser = useSelector(getUser);
    const popoverId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressRef = useRef<{pointerId: number, x: number, y: number,} | null>(null);
    const suppressClickRef = useRef(false);
    const requestRef = useRef(0);
    const focusPopoverRef = useRef(false);
    const [users, setUsers] = useState<IReactionUser[]>([]);
    const [nextPage, setNextPage] = useState<number | null>(null);
    const [total, setTotal] = useState(reaction.count);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [failedPage, setFailedPage] = useState(1);
    const [position, setPosition] = useState<{left: number, top: number,} | null>(null);

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const cancelPress = useCallback(() => {
        if (pressTimerRef.current !== null) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        pressRef.current = null;
    }, []);

    const open = () => {
        clearCloseTimer();
        if (!isOpen) {
            setLoading(true);
        }
        onOpen();
    };

    const scheduleClose = () => {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement) && !popoverRef.current?.contains(document.activeElement)) {
                onClose();
            }
        }, 180);
    };

    const containsTarget = useCallback(
        (target: Node | null) => rootRef.current?.contains(target) || popoverRef.current?.contains(target),
        [],
    );

    const onBlur = (event: React.FocusEvent) => {
        if (!containsTarget(event.relatedTarget as Node)) {
            scheduleClose();
        }
    };

    const loadPage = useCallback(async (page: number) => {
        requestRef.current += 1;
        const requestId = requestRef.current;
        setLoading(true);
        setError('');
        setFailedPage(page);
        if (page === 1) {
            setUsers([]);
            setNextPage(null);
        }
        try {
            const response = await http.get('/users/user/log_reaction_users/', {
                type: logType,
                id: logId,
                emoji: reaction.emoji,
                page,
            });
            if (requestId !== requestRef.current) {
                return;
            }
            setUsers(previous => page === 1 ? response.users : previous.concat(response.users));
            setNextPage(response.next_page);
            setTotal(response.count);
        } catch (e) {
            if (requestId === requestRef.current) {
                setError('Не удалось загрузить список');
            }
        } finally {
            if (requestId === requestRef.current) {
                setLoading(false);
            }
        }
    }, [http, logId, logType, reaction.emoji]);

    useEffect(() => {
        if (isOpen) {
            loadPage(1);
        }
        return () => {
            requestRef.current += 1;
        };
    }, [isOpen, loadPage, reaction.count, reaction.selected, currentUser?.id]);

    useEffect(() => () => {
        clearCloseTimer();
        cancelPress();
    }, [clearCloseTimer, cancelPress]);

    useEffect(() => {
        if (disabled) {
            cancelPress();
        }
    }, [disabled, cancelPress]);

    useLayoutEffect(() => {
        if (!isOpen || !rootRef.current || !popoverRef.current) {
            setPosition(null);
            focusPopoverRef.current = false;
            return;
        }
        const anchor = rootRef.current.getBoundingClientRect();
        const panel = popoverRef.current.getBoundingClientRect();
        const below = anchor.bottom + 6;
        const top = below + panel.height <= window.innerHeight - 12 ? below : anchor.top - panel.height - 6;
        setPosition({
            left: Math.max(12, Math.min(anchor.left, window.innerWidth - panel.width - 12)),
            top: Math.max(12, Math.min(top, window.innerHeight - panel.height - 12)),
        });
        if (focusPopoverRef.current && !isLoading) {
            const firstLink = popoverRef.current.querySelector<HTMLElement>('a, button');
            (firstLink || popoverRef.current).focus({preventScroll: true});
            focusPopoverRef.current = false;
        }
    }, [isOpen, isLoading, users.length, error]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const onPointerDown = (event: PointerEvent) => {
            if (!containsTarget(event.target as Node)) {
                onClose();
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (popoverRef.current?.contains(document.activeElement)) {
                    triggerRef.current?.focus({preventScroll: true});
                }
                onClose();
            }
        };
        const onScroll = (event: Event) => {
            if (!popoverRef.current?.contains(event.target as Node)) {
                onClose();
            }
        };
        const onResize = () => onClose();
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [isOpen, containsTarget, onClose]);

    return (
        <div
            ref={rootRef}
            className={bem.block({selected: reaction.selected})}
            onPointerEnter={event => {
                if (event.pointerType === 'mouse') {
                    open();
                }
            }}
            onPointerLeave={event => {
                if (event.pointerType === 'mouse') {
                    scheduleClose();
                }
            }}
            onFocus={event => {
                if (!pressRef.current && !containsTarget(event.relatedTarget as Node) && (event.target as HTMLElement).matches(':focus-visible')) {
                    open();
                }
            }}
            onBlur={onBlur}
        >
            <button
                ref={triggerRef}
                type='button'
                className={bem.element('button')}
                aria-pressed={reaction.selected}
                aria-label={`${reaction.emoji}: ${reaction.count}. ${reaction.selected ? 'Убрать реакцию' : 'Поставить реакцию'}`}
                aria-expanded={isOpen}
                aria-controls={isOpen ? popoverId : undefined}
                disabled={disabled}
                onPointerDown={event => {
                    cancelPress();
                    suppressClickRef.current = false;
                    if (event.pointerType === 'mouse' || event.button !== 0) {
                        return;
                    }
                    if (!event.isPrimary) {
                        suppressClickRef.current = true;
                        return;
                    }
                    pressRef.current = {
                        pointerId: event.pointerId,
                        x: event.clientX,
                        y: event.clientY,
                    };
                    pressTimerRef.current = setTimeout(() => {
                        pressTimerRef.current = null;
                        suppressClickRef.current = true;
                        focusPopoverRef.current = true;
                        open();
                    }, 500);
                }}
                onPointerMove={event => {
                    const press = pressRef.current;
                    if (press?.pointerId === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
                        cancelPress();
                        suppressClickRef.current = true;
                    }
                }}
                onPointerUp={event => {
                    if (pressRef.current?.pointerId === event.pointerId) {
                        cancelPress();
                    }
                }}
                onPointerCancel={() => {
                    cancelPress();
                    suppressClickRef.current = true;
                }}
                onContextMenu={event => {
                    if (pressRef.current || suppressClickRef.current) {
                        event.preventDefault();
                    }
                }}
                onKeyDown={event => {
                    if (event.key === 'ArrowDown' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                        event.preventDefault();
                        focusPopoverRef.current = true;
                        open();
                        if (isOpen && !isLoading) {
                            (popoverRef.current?.querySelector<HTMLElement>('a, button') || popoverRef.current)?.focus({preventScroll: true});
                            focusPopoverRef.current = false;
                        }
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        suppressClickRef.current = false;
                    }
                }}
                onClick={event => {
                    if (suppressClickRef.current) {
                        event.preventDefault();
                        event.stopPropagation();
                        suppressClickRef.current = false;
                        return;
                    }
                    onClose();
                    onReact(reaction.emoji);
                }}
            >
                <span
                    className={bem.element('emoji')}
                    aria-hidden='true'
                >
                    {reaction.emoji}
                </span>
                <span className={bem.element('count')}>{reaction.count}</span>
            </button>
            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    id={popoverId}
                    className={bem.element('popover')}
                    role='region'
                    tabIndex={-1}
                    aria-label={`Поставили реакцию ${reaction.emoji}`}
                    style={position || {visibility: 'hidden'}}
                    onPointerEnter={clearCloseTimer}
                    onPointerLeave={event => {
                        if (event.pointerType === 'mouse') {
                            scheduleClose();
                        }
                    }}
                    onFocus={clearCloseTimer}
                    onBlur={onBlur}
                >
                    <div className={bem.element('heading')}>
                        {reaction.emoji}
                        {' '}
                        <span>{total}</span>
                    </div>
                    <div className={bem.element('users')}>
                        {users.map(person => (
                            <a
                                key={person.id}
                                href={`/user/${person.id}`}
                                className={bem.element('user')}
                                onClick={event => {
                                    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                                        return;
                                    }
                                    event.preventDefault();
                                    onClose();
                                    dispatch(goToRoute(ROUTE_USER, {userId: person.id}));
                                }}
                            >
                                <img
                                    className={bem.element('avatar')}
                                    src={getDefaultAvatarUrl(person.username, person.gender)}
                                    alt=''
                                    loading='lazy'
                                />
                                <span className={bem.element('username')}>{person.username}</span>
                                <span
                                    className={bem.element('time')}
                                    title={person.reacted_at
                                        ? new Date(person.reacted_at).toLocaleString('ru-RU')
                                        : 'Время реакции не сохранено'}
                                >
                                    {person.reacted_at
                                        ? new Date(person.reacted_at).toLocaleTimeString('ru-RU', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '—'}
                                </span>
                            </a>
                        ))}
                        {isLoading && (
                            <div
                                className={bem.element('message')}
                                role='status'
                            >
                                Загрузка…
                            </div>
                        )}
                        {!isLoading && !error && !users.length && (
                            <div className={bem.element('message')}>Реакцию уже убрали</div>
                        )}
                        {error && (
                            <div
                                className={bem.element('message')}
                                role='alert'
                            >
                                {error}
                                <button
                                    type='button'
                                    className={bem.element('more')}
                                    onClick={() => loadPage(failedPage)}
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        )}
                        {!isLoading && !error && nextPage !== null && (
                            <button
                                type='button'
                                className={bem.element('more')}
                                onClick={() => loadPage(nextPage)}
                            >
                                Показать ещё
                            </button>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

export default ReactionPill;
