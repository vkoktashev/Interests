import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import RandomCard from './views/RandomCard';
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
    return item.tmdb_name || item.name || item.title || 'Тайтл';
}

function getCandidateId(item: any) {
    return item?.tmdb_id
        ?? item?.id
        ?? item?.slug
        ?? item?.tmdb_name
        ?? item?.name;
}

const REEL_ITEM_HEIGHT = 36;
const REEL_VIEW_HEIGHT = 260;
const REEL_SPIN_MIN_DURATION_MS = 5200;
const REEL_SETTLE_DURATION_MS = 1200;
const REEL_FOCUS_HOLD_MS = 500;
const REEL_MIN_CYCLES = 4;

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
    const [reelPhase, setReelPhase] = useState<'idle' | 'waiting' | 'spinning' | 'done'>('idle');
    const [isReelSettled, setReelSettled] = useState(false);
    const [isImageLoaded, setImageLoaded] = useState(false);
    const [isFocusHold, setFocusHold] = useState(false);
    const resultRef = useRef<HTMLDivElement | null>(null);
    const reelTrackRef = useRef<HTMLDivElement | null>(null);
    const spinOffsetRef = useRef(0);

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
            setFocusHold(false);
            spinOffsetRef.current = 0;
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
        if (!winner?.tmdb_poster_path && !winner?.poster_path) {
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

    const reelTitles = useMemo(() => {
        const allTitles = reelItems.map((item: any) => (
            typeof item === 'string' ? item : getCandidateTitle(item)
        ));
        // Limit reel to ~10 unique items to avoid DOM bloat and insane scroll speed
        const MAX_REEL_TITLES = 10;
        if (allTitles.length <= MAX_REEL_TITLES) return allTitles;
        // Always include winner (index 0), sample the rest evenly
        const sampled: string[] = [allTitles[0]];
        const step = (allTitles.length - 1) / (MAX_REEL_TITLES - 1);
        for (let i = 1; i < MAX_REEL_TITLES; i++) {
            sampled.push(allTitles[Math.round(i * step)]);
        }
        return sampled;
    }, [reelItems]);

    const reelMeta = useMemo(() => {
        const baseCount = reelTitles.length || 1;
        const minVisible = Math.ceil(REEL_VIEW_HEIGHT / REEL_ITEM_HEIGHT) + 4;
        const minCycles = REEL_MIN_CYCLES + 2;
        const repeatCount = Math.max(minCycles, Math.ceil(minVisible / baseCount) + minCycles);
        const loop: string[] = [];
        for (let i = 0; i < repeatCount; i += 1) {
            loop.push(...reelTitles);
        }
        return { loop, baseCount };
    }, [reelTitles]);


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
        if (reelPhase !== 'spinning' || !reelTrackRef.current || !candidates.length || !winner) {
            return;
        }
        const baseCount = reelMeta.baseCount;
        const cycleHeight = baseCount * REEL_ITEM_HEIGHT;
        if (cycleHeight <= 0) return;

        const winnerTitle = getCandidateTitle(winner);
        const baseIndex = Math.max(0, reelTitles.indexOf(winnerTitle));
        const centerOffset = (REEL_VIEW_HEIGHT / 2) - (REEL_ITEM_HEIGHT / 2);

        // Target: REEL_MIN_CYCLES full cycles + land on winner
        const totalDistance = REEL_MIN_CYCLES * cycleHeight + baseIndex * REEL_ITEM_HEIGHT - centerOffset;

        const totalDuration = REEL_SPIN_MIN_DURATION_MS + REEL_SETTLE_DURATION_MS;
        const startTime = performance.now();
        const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

        let rafId: number;
        const tick = (time: number) => {
            const progress = Math.min(1, (time - startTime) / totalDuration);
            const eased = easeOutQuad(progress);
            const currentOffset = totalDistance * eased;

            if (reelTrackRef.current) {
                reelTrackRef.current.style.transform = `translate3d(0, ${-currentOffset}px, 0)`;
            }

            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                spinOffsetRef.current = totalDistance;
                setReelSettled(true);
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [reelPhase, candidates, winner, reelMeta.baseCount, reelTitles]);

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
                    <img src={winner?.tmdb_poster_path}
                           onLoad={() => setImageLoaded(true)}
                           style={{width: 0, height: 0}} />
                )}
                {winner?.poster_path && !winner?.tmdb_poster_path && (
                    <img
                        src={winner?.poster_path}
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
