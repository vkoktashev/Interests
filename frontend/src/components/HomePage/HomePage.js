import React from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";
import { useHistory } from "react-router-dom";
import "./home-page.sass";

/**
 * Основная страница приложения
 */
const HomePage = observer((props) => {
	let history = useHistory();
	const { user, loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;

	return (
		<div className='home-page'>
			<div className='home-page__body'>
				<h1 className='home-page__header'>Добро пожаловать на Interests!</h1>
				<h3 className='home-page__header-secondary'>Что это?</h3>
				<p className='home-page__text'>Interests - сайт для отслеживания фильмов, сериалов и видеоигр. </p>
				<h3 className='home-page__header-secondary'>Какой функционал у сайта?</h3>
				<p className='home-page__text'>Здесь можно вести персональный список интересного вам контента, выставлять ему оценки и писать отзывы, а также отслеживать активность ваших друзей.</p>
				<p className='home-page__text'>
					В{" "}
					<a
						className='home-page__link'
						href={"/user/" + user?.id}
						onClick={(e) => {
							e.preventDefault();
							if (!loggedIn) {
								openLoginForm();
							} else {
								history.push("/user/" + user?.id);
							}
						}}>
						профиле
					</a>{" "}
					собраны все добавленные игры, фильмы и сериалы, а также ваша персональная статистика.
				</p>
				<p className='home-page__text'>
					C помощью{" "}
					<a className='home-page__link' href='/search/example'>
						поиска
					</a>{" "}
					можно найти интересущий вас тайтл или человека.
				</p>
				<p className='home-page__text'>
					В{" "}
					<a className='home-page__link' href={"/calendar/"}>
						календаре
					</a>{" "}
					отображены все грядущие релизы из вашего списка. Вы можете подписаться на email уведомления о новых релизах в{" "}
					<a className='home-page__link' href={"/settings/"}>
						настройках
					</a>
				</p>
				<p className='home-page__text'>
					Раздел{" "}
					<a className='home-page__link' href={"/unwatched/"}>
						непросмотренное
					</a>{" "}
					предназначен для отслеживания непрсмотренных серий ваших сериалов.
				</p>
				<h3 className='home-page__header-secondary'>Что такое статус контента</h3>
				<p className='home-page__text'>
					На странице фильма, сериала или игры есть блок кнопок, состоящий из различных статусов. При выборе любого статуса, кроме "Не смотрел" или "Не играл", тайтл добавляется к вам в профиль.
				</p>
				<p className='home-page__text'>
					В зависимости от статуса, тайтл будет по разному восприниматься системой. Например, тайтлы со статусом "Буду смотреть" не учитываются при подсчете статистики. Или сериалы со статусом
					"Дропнул" не будут выводиться в разделах Непросмотренное и Календарь.
				</p>
				<h3 className='home-page__header-secondary'>Зачем нужна подписка на пользователя</h3>
				<p className='home-page__text'>После подписки на пользователя вы будете видеть активность всех своих друзей в разделе Профиль, во вкладке Друзья.</p>
				<p className='home-page__text'>На странице любого тайтла будут отображены отзывы ваших друзей, если они оценили его ранее.</p>
			</div>
		</div>
	);
});

export default HomePage;
