import React from "react";
import classnames from "classnames";

import "./modal.sass";

function Modal({ className, children, isOpen, toggle }) {
	if (isOpen) {
		return (
			<div hidden={!isOpen} className={classnames("modal2")}>
				<div className={classnames("modal2__backdrop")} onClick={toggle} hidden={!isOpen} />
				<div className={classnames("modal2__content", className)}>{children}</div>
			</div>
		);
	} else return null;
}

export default Modal;
