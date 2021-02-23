import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "./store/AuthStore";

import Routes from "./Routes";
import "react-toastify/dist/ReactToastify.css";

const App = observer((props) => {
	const { checkAuthorization } = AuthStore;

	useEffect(
		() => {
			checkAuthorization();
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
});

export default App;
