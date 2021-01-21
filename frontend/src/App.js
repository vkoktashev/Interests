import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { connect } from "react-redux";
import Routes from "./Routes";
import * as actions from "./store/actions";
import "react-toastify/dist/ReactToastify.css";

function App({ onLoad }) {
	useEffect(
		() => {
			onLoad();
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return (
		<Router>
			<div className='flyout'>
				<main>
					<Routes />
				</main>
			</div>
		</Router>
	);
}

const mapDispatchToProps = (dispatch) => {
	return {
		onLoad: () => {
			dispatch(actions.checkAuthorization());
		},
	};
};

export default connect(null, mapDispatchToProps)(App);
