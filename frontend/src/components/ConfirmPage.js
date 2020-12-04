import React, {
    useEffect
} from "react";
import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

/**
 * Основная страница приложения
 */
function ConfirmPage ( {confirmEmailRequest} ) 
{
	let search = window.location.search;
	let params = new URLSearchParams(search);
	let uid64 = params.get('uid64');
	let token = params.get('token');

	useEffect(
		() => {
			confirmEmailRequest(uid64, token);
		},
		[confirmEmailRequest, token, uid64]
	);
	
    return (
			<div>
				
			</div>
    	);
}

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
        confirmEmailRequest: (uid64, token) => {
            dispatch(actions.confirmEmailRequest(uid64, token));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmPage);