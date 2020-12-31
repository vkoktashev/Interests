import React from "react";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
//import * as actions from '../store/actions';

/**
 * Основная страница приложения
 */
function HomePage ({user}) 
{
    return (
			<div className="bg">
				<h2 style={{marginTop: '70px', marginLeft: '30px'}}>Добро пожаловать на Interests!</h2>
				<h4 style={{marginLeft: '30px'}}>
					Главная страница ещё не готова, однако можно воспользоваться <a href='/search/example' style={{fontWeight: '600'}}>поиском</a> или проверить свой <a href={"/user/"+user.id} style={{fontWeight: '600'}}>профиль</a>, если вы уже зарегистрированы
				</h4>
				<img src="images/cool.jpg" style={{marginLeft: '20px'}} alt="Картинка"/>
			</div>
    	);
}

const mapStateToProps = state => ({
    user: selectors.getUser(state)
});

  const mapDispatchToProps = () => {
	return {
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(HomePage);
