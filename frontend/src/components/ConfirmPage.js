import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { useHistory } from "react-router-dom";
import AuthStore from "../store/AuthStore";

/**
 * Основная страница приложения
 */
const ConfirmPage = observer((props) => {
	const { confirmEmail, confirmEmailState } = AuthStore;
	let history = useHistory();

	let search = window.location.search;
	let params = new URLSearchParams(search);
	let uid64 = params.get("uid64");
	let token = params.get("token");

	useEffect(
		() => {
			confirmEmail(uid64, token);
		},
		// eslint-disable-next-line
		[]
	);

	useEffect(
		() => {
			if (confirmEmailState.startsWith("error")) history.push(`/404page`);
		},
		// eslint-disable-next-line
		[confirmEmailState]
	);

	return (
		<div className='bg'>
			<div hidden={confirmEmailState !== "done"} className='confirmEmailSuccess'>
				Ваша почта подтверждена!
			</div>
		</div>
	);
});

export default ConfirmPage;
