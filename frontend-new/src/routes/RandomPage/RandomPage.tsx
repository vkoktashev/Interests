import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import RandomCard from './views/RandomCard';
import Image from '../../shared/Image';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import { getUser } from '@steroidsjs/core/reducers/auth';
import {Button, CheckboxField, Form} from '@steroidsjs/core/ui/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import "./RandomPage.scss";

const categoriesEnum = [
    {id: 'games', label: 'Игры'},
    {id: 'shows', label: 'Сериалы'},
    {id: 'movies', label: 'Фильмы'},
]

const fallbackReelItems = [
    'Новый сериал',
    'Фильм вечера',
    'Игра на выходные',
    'Неожиданная находка',
    'Классика жанра',
    'Свежий релиз',
];

function getCandidateTitle(item: any) {
    if (!item) return '';
    return item.tmdb_name || item.rawg_name || item.name || item.title || 'Тайтл';
}

function getCandidateId(item: any) {
    return item?.tmdb_id
        ?? item?.rawg_id
        ?? item?.id
        ?? item?.rawg_slug
        ?? item?.slug
        ?? item?.tmdb_name
        ?? item?.rawg_name;
}

function parseTranslateY(transform: string) {
    if (!transform || transform === 'none') return 0;
    if (transform.startsWith('matrix3d(')) {
        const values = transform.replace('matrix3d(', '').replace(')', '').split(',').map(Number);
        return values[13] || 0;
    }
    if (transform.startsWith('matrix(')) {
        const values = transform.replace('matrix(', '').replace(')', '').split(',').map(Number);
        return values[5] || 0;
    }
    return 0;
}

const REEL_ITEM_HEIGHT = 36;
const REEL_VIEW_HEIGHT = 260;
const REEL_SPIN_MIN_DURATION_MS = 5200;
const REEL_SETTLE_DURATION_MS = 1200;
const REEL_FOCUS_HOLD_MS = 500;
const REEL_MIN_CYCLES = 4;
const REEL_TARGET_ITEMS = 18;
const REEL_PX_PER_SEC = 140;

function RandomPage() {
    const user = useSelector(getUser);
    const dispatch = useDispatch();
    const {http} = useComponents();
    const bem = useBem('RandomPage');
    const [winner, setWinner] = useState<null | any>(null);
    const [isLoading, setLoading] = useState(false);
    const [isRevealing, setRevealing] = useState(false);
    const [revealKey, setRevealKey] = useState(0);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [reelPhase, setReelPhase] = useState<'idle' | 'waiting' | 'spinning' | 'settling' | 'done'>('idle');
    const [isReelSettled, setReelSettled] = useState(false);
    const [isImageLoaded, setImageLoaded] = useState(false);
    const [hasResult, setHasResult] = useState(false);
    const [minSpinElapsed, setMinSpinElapsed] = useState(false);
    const [isFocusHold, setFocusHold] = useState(false);
    const resultRef = useRef<HTMLDivElement | null>(null);
    const reelTrackRef = useRef<HTMLDivElement | null>(null);
    const spinTimeoutRef = useRef<number | null>(null);
    const spinOffsetRef = useRef(0);
    const spinTimeRef = useRef<number | null>(null);

    const onSubmit = useCallback((values: any) => {
        if (!values.games && !values.movies && !values.shows) {
            return false;
        }
        if (user) {
            setWinner(null);
            setCandidates([]);
            setLoading(true);
            setReelPhase('waiting');
            setReelSettled(false);
            setImageLoaded(false);
            setHasResult(false);
            setMinSpinElapsed(false);
            setFocusHold(false);
            spinOffsetRef.current = 0;
            spinTimeRef.current = null;
            if (reelTrackRef.current) {
                reelTrackRef.current.style.transform = 'translate3d(0, 0, 0)';
            }
            const params = {
                categories: Object.entries(values)
                    .filter(([key, value]) => key !== 'endedOnly' && key !== 'allFromDb' && value)
                    .map(([key]) => key),
                endedOnly: values.endedOnly,
                allFromDb: values.allFromDb,
            };
            if (!params.categories.length) {
                dispatch(showNotification('Выберите хотя бы одну категорию', 'warning'));
                setLoading(false);
                return false;
            }

            http.get('/users/user/random/', params)
                .then(response => {
                    const list = Array.isArray(response) ? response : [];
                    if (!list.length) {
                        setWinner(null);
                        setCandidates([]);
                        setImageLoaded(true);
                        setReelPhase('done');
                        setLoading(false);
                        dispatch(showNotification('Подходящих вариантов не найдено', 'warning'));
                        return;
                    }
                    setCandidates(list);
                    setWinner(list[0] || null);
                    setRevealKey((value) => value + 1);
                    setHasResult(true);
                    setReelPhase('spinning');
                })
                .catch(e => {
                    dispatch(showNotification(`Ошибка сервера ${e.response.data?.error}`, 'danger'));
                    setLoading(false);
                    setReelPhase('done');
                });
        }
    }, [user, dispatch, http]);

    useEffect(() => {
        if (!winner) return;
        if (!winner?.tmdb_poster_path && !winner?.rawg_poster_path) {
            setImageLoaded(true);
        }
    }, [winner]);

    useEffect(() => {
        if (!winner) {
            return;
        }
        setRevealing(true);
        resultRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
        const timer = window.setTimeout(() => {
            setRevealing(false);
        }, 900);
        return () => window.clearTimeout(timer);
    }, [winner]);

    const reelItems = useMemo(() => (
        candidates.length ? candidates : fallbackReelItems
    ), [candidates]);

    const reelTitles = useMemo(() => (
        reelItems.map((item: any) => (
            typeof item === 'string' ? item : getCandidateTitle(item)
        ))
    ), [reelItems]);

    const reelMeta = useMemo(() => {
        const baseCount = reelTitles.length || 1;
        const cyclesToMove = Math.max(REEL_MIN_CYCLES, Math.ceil(REEL_TARGET_ITEMS / baseCount));
        const minVisible = Math.ceil(REEL_VIEW_HEIGHT / REEL_ITEM_HEIGHT) + 4;
        const repeatCount = Math.max(cyclesToMove * 2, Math.ceil(minVisible / baseCount) + 2);
        const loop: string[] = [];
        for (let i = 0; i < repeatCount; i += 1) {
            loop.push(...reelTitles);
        }
        const distance = baseCount * cyclesToMove * REEL_ITEM_HEIGHT;
        const duration = Math.max(REEL_SPIN_MIN_DURATION_MS / 1000, distance / REEL_PX_PER_SEC);
        return {
            loop,
            distance,
            duration,
            cyclesToMove,
        };
    }, [reelTitles]);

    const reelTargetY = useMemo(() => {
        if (!winner || !candidates.length) {
            return undefined;
        }
        const winnerId = getCandidateId(winner);
        const index = candidates.findIndex(item => getCandidateId(item) === winnerId);
        const baseIndex = index >= 0 ? index : 0;
        const settleIndex = baseIndex + candidates.length;
        const centerOffset = (REEL_VIEW_HEIGHT / 2) - (REEL_ITEM_HEIGHT / 2);
        return centerOffset - settleIndex * REEL_ITEM_HEIGHT;
    }, [winner, candidates]);

    useEffect(() => {
        if (reelPhase !== 'settling') return;
        if (!reelTrackRef.current || reelTargetY === undefined) {
            setReelSettled(true);
            return;
        }
        const computed = window.getComputedStyle(reelTrackRef.current);
        const currentTransform = computed.transform === 'none' ? 'translate3d(0, 0, 0)' : computed.transform;
        const currentY = parseTranslateY(currentTransform);
        const loopHeight = Math.max(reelMeta.loop.length * REEL_ITEM_HEIGHT, REEL_ITEM_HEIGHT);
        const k = Math.round((currentY - reelTargetY) / loopHeight);
        const adjustedTargetY = reelTargetY + k * loopHeight;
        const start = performance.now();
        const duration = REEL_SETTLE_DURATION_MS;
        let rafId: number;
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const tick = (time: number) => {
            const progress = Math.min(1, (time - start) / duration);
            const eased = easeOutCubic(progress);
            const value = currentY + (adjustedTargetY - currentY) * eased;
            if (reelTrackRef.current) {
                reelTrackRef.current.style.transform = `translate3d(0, ${value}px, 0)`;
            }
            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                setReelSettled(true);
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [reelPhase, reelMeta.loop.length, reelTargetY]);

    useEffect(() => () => {
        if (spinTimeoutRef.current) {
            window.clearTimeout(spinTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!isReelSettled || !isImageLoaded) {
            return;
        }
        setFocusHold(true);
        const timer = window.setTimeout(() => {
            setFocusHold(false);
            setReelPhase('done');
            setLoading(false);
        }, REEL_FOCUS_HOLD_MS);
        return () => window.clearTimeout(timer);
    }, [isReelSettled, isImageLoaded]);

    useEffect(() => {
        if (reelPhase !== 'spinning') {
            return;
        }
        if (spinTimeoutRef.current) {
            window.clearTimeout(spinTimeoutRef.current);
        }
        spinTimeoutRef.current = window.setTimeout(() => {
            setMinSpinElapsed(true);
        }, REEL_SPIN_MIN_DURATION_MS);
    }, [reelPhase]);

    useEffect(() => {
        if (reelPhase === 'spinning' && hasResult && minSpinElapsed) {
            setReelPhase('settling');
        }
    }, [reelPhase, hasResult, minSpinElapsed]);

    useEffect(() => {
        if (reelPhase !== 'spinning' || !reelTrackRef.current) {
            return;
        }
        const loopHeight = Math.max(reelMeta.loop.length * REEL_ITEM_HEIGHT, REEL_ITEM_HEIGHT);
        spinOffsetRef.current = spinOffsetRef.current % loopHeight;
        reelTrackRef.current.style.transform = `translate3d(0, ${-spinOffsetRef.current}px, 0)`;
        let rafId: number;
        const tick = (time: number) => {
            if (spinTimeRef.current === null) {
                spinTimeRef.current = time;
            }
            const delta = (time - spinTimeRef.current) / 1000;
            spinTimeRef.current = time;
            spinOffsetRef.current = (spinOffsetRef.current + REEL_PX_PER_SEC * delta) % loopHeight;
            const offset = spinOffsetRef.current;
            if (reelTrackRef.current) {
                reelTrackRef.current.style.transform = `translate3d(0, ${-offset}px, 0)`;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [reelPhase, reelMeta.loop.length]);

    return (
        <div className={bem.block()}>
            <Form
                onSubmit={onSubmit}
                className={bem.element('form')}
            >
                <div className={bem.element('hero')}>
                    <div>
                        <h1 className={bem.element('header')}>
                            Рандомайзер
                        </h1>
                        <p className={bem.element('subtitle')}>
                            Выберите категории и получите один точный совет — без долгих раздумий.
                        </p>
                    </div>
                    <div className={bem.element('pill')}>Персональные подборки</div>
                </div>
                <div className={bem.element('panel')}>
                    <div className={bem.element('label')}>
                        Категории
                    </div>
                    <div className={bem.element('checkbox-grid')}>
                        {
                            categoriesEnum.map((category: any) => (
                                <CheckboxField
                                    attribute={category.id}
                                    label={category.label}
                                    key={category.id}
                                    className={bem.element('checkbox')}
                                />
                            ))
                        }
                    </div>
                    <CheckboxField
                        attribute='endedOnly'
                        label={__('Только завершенные сериалы')}
                        className={bem.element('checkbox')}
                    />
                    <CheckboxField
                        attribute='allFromDb'
                        label={__('Искать по всей базе (неигранные/непросмотренные)')}
                        className={bem.element('checkbox')}
                    />
                    <Button
                        type='submit'
                        label={isLoading ? 'Крутим...' : 'Крутануть'}
                        className={bem.element('spin')}
                    />
                    {!user && (
                        <div className={bem.element('hint')}>
                            Войдите, чтобы получить персональный результат.
                        </div>
                    )}
                </div>
            </Form>
            <div className={bem.element('preload')}>
                {winner?.tmdb_poster_path && (
                    <Image src={winner?.tmdb_poster_path}
                           onLoad={() => setImageLoaded(true)}
                           style={{width: 0, height: 0}} />
                )}
                {winner?.rawg_poster_path && !winner?.tmdb_poster_path && (
                    <img
                        src={winner?.rawg_poster_path}
                        onLoad={() => setImageLoaded(true)}
                        style={{width: 0, height: 0}}
                        alt=''
                    />
                )}
            </div>
            <div
                ref={resultRef}
                className={bem.element('result', {
                    reveal: isRevealing,
                    empty: !winner,
                })}
            >
                {isLoading && (
                    <div className={bem.element('reel')}>
                        <div className={bem.element('reel-focus', {hold: isFocusHold})} />
                        <div className={bem.element('reel-track')}>
                            <div
                                className={bem.element('reel-track-inner', {
                                    spinning: reelPhase === 'spinning',
                                    hold: isFocusHold,
                                })}
                                style={{
                                    ['--reel-distance' as any]: `-${reelMeta.distance}px`,
                                    ['--reel-duration' as any]: `${reelMeta.duration}s`,
                                }}
                                ref={reelTrackRef}
                            >
                                {reelPhase === 'waiting' ? (
                                    <div className={bem.element('reel-item')}>
                                        Собираем список...
                                    </div>
                                ) : (
                                    reelMeta.loop.map((item, index) => (
                                        <div className={bem.element('reel-item')} key={`${item}-${index}`}>
                                            {item}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {!isLoading && winner ? (
                    <RandomCard winner={winner} key={revealKey} />
                ) : !winner ? (
                    <div className={bem.element('result-placeholder')}>
                        Результат появится здесь после прокрутки
                    </div>
                ) : null}
            </div>
            {/*{*/}
            {/*    isLoading && (*/}
            {/*        <RandomCardLoader />*/}
            {/*    )*/}
            {/*}*/}
        </div>
);
}

export default RandomPage;
