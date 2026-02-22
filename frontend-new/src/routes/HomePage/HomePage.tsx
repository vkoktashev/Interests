import React from "react";
import "./home-page.scss";
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginForm from '../../modals/LoginForm';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {ROUTE_FAQ, ROUTE_SEARCH, ROUTE_USER} from '../index';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {Button} from '@steroidsjs/core/ui/form';
import NextReleaseCard from './views/NextReleaseCard/NextReleaseCard';
import UnwatchedCard from './views/UnwatchedCard/UnwatchedCard';
import TrendingBlock from './views/TrendingBlock/TrendingBlock';
import CommunityPicksBlock from './views/CommunityPicksBlock/CommunityPicksBlock';

/**
 * Основная страница приложения
 */
export function HomePage() {
	const bem = useBem('home-page');
	const dispatch = useDispatch();
	const user = useSelector(getUser);
	const loggedIn = !!user?.id;

	return (
		<div className={bem.block()}>
			<section className={bem.element('hero')}>
				<div className={bem.element('hero-content')}>
					<span className={bem.element('badge')}>Interests • личная медиатека</span>
					<h1 className={bem.element('title')}>Соберите всё, что вам интересно, в одном месте.</h1>
					<p className={bem.element('subtitle')}>
						Фильмы, сериалы и игры — без разрозненных заметок. Interests
						объединяет списки, оценки, отзывы и друзей, чтобы вы видели свою
						медиажизнь как на ладони.
					</p>
					<div className={bem.element('cta')}>
						<Button
							toRoute={ROUTE_SEARCH}
							toRouteParams={{
								query: 'Ведьмак',
							}}
							showQueryParams
							className={bem.element('button')}
						>
							Начать поиск
						</Button>
						<Button
							className={bem.element('button', {ghost: true})}
							onClick={(e) => {
								e.preventDefault();
								if (!loggedIn) {
									dispatch(openModal(LoginForm));
								} else {
									dispatch(goToRoute(ROUTE_USER, {
										userId: user?.id,
									}))
								}
							}}>
							Открыть профиль
						</Button>
					</div>
					<div className={bem.element('quick')}>
						<div className={bem.element('quick-item')}>Персональные списки</div>
						<div className={bem.element('quick-item')}>Умная статистика</div>
						<div className={bem.element('quick-item')}>Активность друзей</div>
					</div>
				</div>
				<div className={bem.element('hero-art')}>
					<NextReleaseCard loggedIn={loggedIn} />
					<UnwatchedCard loggedIn={loggedIn} />
					<div className={bem.element('card', {outline: true})}>
						<p className={bem.element('card-title')}>Оценки друзей</p>
						<p className={bem.element('card-value')}>8 отзывов</p>
						<p className={bem.element('card-note')}>Свежие рекомендации</p>
					</div>
				</div>
			</section>

			<TrendingBlock />
			<CommunityPicksBlock />

			<section className={bem.element('section')}>
				<h2 className={bem.element('section-title')}>Как устроен Interests</h2>
				<div className={bem.element('feature-grid')}>
					<div className={bem.element('feature', {wide: true})}>
						<h3 className={bem.element('feature-title')}>FAQ и описание</h3>
						<p className={bem.element('feature-text')}>
							Вынесли подробное описание возможностей, статусов, прогресса и логики работы
							в отдельную страницу, чтобы главная оставалась компактной.
						</p>
						<div className={bem.element('feature-actions')}>
							<Button toRoute={ROUTE_FAQ} className={bem.element('button', {ghost: true})}>
								Открыть FAQ
							</Button>
						</div>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Что внутри FAQ</h3>
						<p className={bem.element('feature-text')}>
							Зачем нужен сервис, как работают статусы, как считать прогресс, зачем
							подписываться на друзей и как пользоваться календарём релизов.
						</p>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Быстрый старт</h3>
						<p className={bem.element('feature-text')}>
							Если хотите без чтения, просто начните с поиска и добавьте первый фильм,
							сериал или игру в свой список.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}

export default HomePage;
