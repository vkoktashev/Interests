import React from "react";
import { useHistory } from "react-router-dom";
import "./home-page.scss";
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginForm from '../../modals/LoginForm';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {ROUTE_SEARCH, ROUTE_USER} from '../index';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {Button} from '@steroidsjs/core/ui/form';
import NextReleaseCard from './views/NextReleaseCard/NextReleaseCard';
import UnwatchedCard from './views/UnwatchedCard/UnwatchedCard';
import {Link} from '@steroidsjs/core/ui/nav';

/**
 * Основная страница приложения
 */
export function HomePage() {
	let history = useHistory();
	const bem = useBem('home-page');
	const dispatch = useDispatch();
	const user = useSelector(getUser);
	const loggedIn = !!user?.id;

	return (
		<div className={bem.block()}>
			<section className={bem.element('hero')}>
				<div className={bem.element('hero-content')}>
					<span className={bem.element('badge')}>Interests • личная медиатека</span>
					<h1 className={bem.element('title')}>Соберите всё, что вам интересно, в одном красивом месте.</h1>
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

			<section className={bem.element('section')}>
				<h2 className={bem.element('section-title')}>Зачем вам Interests</h2>
				<div className={bem.element('feature-grid')}>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Единый профиль</h3>
						<p className={bem.element('feature-text')}>
							Все добавленные тайтлы, списки и личная статистика живут в вашем{" "}
							<a
								className={bem.element('link')}
								href={"/user/" + user?.id}
								onClick={(e) => {
									e.preventDefault();
									if (!loggedIn) {
										dispatch(openModal(LoginForm));
									} else {
										history.push("/user/" + user?.id);
									}
								}}>
								профиле
							</a>
							. Вы видите полную картину без хаоса и лишних вкладок.
						</p>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Поиск без усилий</h3>
						<p className={bem.element('feature-text')}>
							Используйте{" "}
							<Link
								className={bem.element('link')}
								toRoute={ROUTE_SEARCH}
								toRouteParams={{
									query: 'Ведьмак',
								}}
								showQueryParams
							>
								поиск
							</Link>
							, чтобы найти тайтл или человека, сравнить оценки и сразу
							добавить в список интересов.
						</p>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Время под контролем</h3>
						<p className={bem.element('feature-text')}>
							В{" "}
							<a className={bem.element('link')} href={"/calendar/"}>календаре</a>{" "}
							собраны грядущие релизы. Настройте email-уведомления в{" "}
							<a className={bem.element('link')} href={"/settings/"}>настройках</a>
							{" "}и не пропускайте премьеры.
						</p>
					</div>
				</div>
			</section>

			<section className={bem.element('section', {steps: true})}>
				<h2 className={bem.element('section-title')}>Как это работает</h2>
				<div className={bem.element('steps')}>
					<div className={bem.element('step')}>
						<p className={bem.element('step-label')}>Шаг 1</p>
						<h3 className={bem.element('step-title')}>Добавьте тайтл</h3>
						<p className={bem.element('step-text')}>
							Найдите фильм, сериал или игру и сохраните в личный список.
						</p>
					</div>
					<div className={bem.element('step')}>
						<p className={bem.element('step-label')}>Шаг 2</p>
						<h3 className={bem.element('step-title')}>Выберите статус</h3>
						<p className={bem.element('step-text')}>
							Статусы помогают планировать просмотры и корректно считать
							статистику.
						</p>
					</div>
					<div className={bem.element('step')}>
						<p className={bem.element('step-label')}>Шаг 3</p>
						<h3 className={bem.element('step-title')}>Следите за прогрессом</h3>
						<p className={bem.element('step-text')}>
							Списки, оценки и рекомендации друзей обновляются автоматически.
						</p>
					</div>
				</div>
			</section>

			<section className={bem.element('section')}>
				<h2 className={bem.element('section-title')}>Про статусы и прогресс</h2>
				<div className={bem.element('status-grid')}>
					<div className={bem.element('status-card')}>
						<h3 className={bem.element('status-title')}>Планирую</h3>
						<p className={bem.element('status-text')}>
							Тайтлы со статусом «Буду смотреть/играть» не попадают в общую
							статистику, но остаются в поле зрения.
						</p>
					</div>
					<div className={bem.element('status-card')}>
						<h3 className={bem.element('status-title')}>Смотрю/Играю</h3>
						<p className={bem.element('status-text')}>
							Вы видите прогресс в{" "}
							<a className={bem.element('link')} href={"/unwatched/"}>непросмотренном</a>
							{" "}и получаете напоминания о новых сериях.
						</p>
					</div>
					<div className={bem.element('status-card')}>
						<h3 className={bem.element('status-title')}>Завершено</h3>
						<p className={bem.element('status-text')}>
							Оценки и отзывы формируют рекомендации и видны вашим друзьям.
						</p>
					</div>
				</div>
			</section>

			<section className={bem.element('section', {social: true})}>
				<h2 className={bem.element('section-title')}>Друзья в фокусе</h2>
				<div className={bem.element('social')}>
					<div className={bem.element('social-block')}>
						<h3 className={bem.element('social-title')}>Подписки</h3>
						<p className={bem.element('social-text')}>
							Подписывайтесь на людей и смотрите их активность в профиле,
							во вкладке «Друзья». Это быстрый способ узнать, что смотрят
							и во что играют ваши близкие.
						</p>
					</div>
					<div className={bem.element('social-block')}>
						<h3 className={bem.element('social-title')}>Отзывы друзей</h3>
						<p className={bem.element('social-text')}>
							На странице каждого тайтла отображаются оценки и отзывы ваших
							друзей — выбирайте контент уверенно.
						</p>
					</div>
				</div>
			</section>

			<section className={bem.element('cta-banner')}>
				<h2 className={bem.element('cta-title')}>Соберите свою медиатеку сегодня</h2>
				<p className={bem.element('cta-text')}>
					Interests помогает держать контент в порядке и превращает списки в
					красивую историю вашего времени.
				</p>
				<Button
					toRoute={ROUTE_SEARCH}
					toRouteParams={{
						query: 'Ведьмак',
					}}
					showQueryParams
					className={bem.element('button', {light: true})}
				>
					Перейти к поиску
				</Button>
			</section>
		</div>
	);
}

export default HomePage;
