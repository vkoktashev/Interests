import React from "react";
import {useBem} from "@steroidsjs/core/hooks";
import {Link} from "@steroidsjs/core/ui/nav";
import {ROUTE_SEARCH} from "../index";
import "./faq-page.scss";

function FAQPage() {
	const bem = useBem('home-page');

	return (
		<div className='home-page faq-page'>
			<section className={bem.element('section')}>
				<h1 className={bem.element('section-title')}>FAQ и описание Interests</h1>
				<p className={bem.element('feature-text')}>
					Здесь собрана базовая информация о том, как устроены статусы, прогресс,
					списки, календарь и взаимодействие с друзьями.
				</p>
			</section>

			<section className={bem.element('section')}>
				<h2 className={bem.element('section-title')}>Зачем вам Interests</h2>
				<div className={bem.element('feature-grid')}>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Единый профиль</h3>
						<p className={bem.element('feature-text')}>
							Все добавленные тайтлы, списки и личная статистика живут в одном профиле.
							Вы видите полную картину без хаоса и лишних вкладок.
						</p>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Поиск без усилий</h3>
						<p className={bem.element('feature-text')}>
							Используйте{" "}
							<Link
								className={bem.element('link')}
								toRoute={ROUTE_SEARCH}
								toRouteParams={{query: 'Ведьмак'}}
								showQueryParams
							>
								поиск
							</Link>
							, чтобы найти тайтл или человека, сравнить оценки и сразу добавить в список интересов.
						</p>
					</div>
					<div className={bem.element('feature')}>
						<h3 className={bem.element('feature-title')}>Время под контролем</h3>
						<p className={bem.element('feature-text')}>
							В календаре собраны грядущие релизы. Настройте email-уведомления в настройках
							и не пропускайте премьеры.
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
							Статусы помогают планировать просмотры и корректно считать статистику.
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
							Тайтлы со статусом «Буду смотреть/играть» не попадают в общую статистику,
							но остаются в поле зрения.
						</p>
					</div>
					<div className={bem.element('status-card')}>
						<h3 className={bem.element('status-title')}>Смотрю/Играю</h3>
						<p className={bem.element('status-text')}>
							Вы видите прогресс в непросмотренном и получаете напоминания о новых сериях.
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
							Подписывайтесь на людей и смотрите их активность в профиле и во вкладке «Друзья».
						</p>
					</div>
					<div className={bem.element('social-block')}>
						<h3 className={bem.element('social-title')}>Отзывы друзей</h3>
						<p className={bem.element('social-text')}>
							На странице каждого тайтла отображаются оценки и отзывы ваших друзей.
						</p>
					</div>
				</div>
			</section>

		</div>
	);
}

export default FAQPage;
