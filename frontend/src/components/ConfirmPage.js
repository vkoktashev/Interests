import React, { useEffect } from "react";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";

/**
 * Основная страница приложения
 */
const ConfirmPage = observer((props) => {
	const { confirmEmailRequest } = AuthStore;

	let search = window.location.search;
	let params = new URLSearchParams(search);
	let uid64 = params.get("uid64");
	let token = params.get("token");

	useEffect(
		() => {
			confirmEmailRequest(uid64, token);
		},
		// eslint-disable-next-line
		[]
	);

	return <div className='bg'></div>;
});

export default ConfirmPage;
