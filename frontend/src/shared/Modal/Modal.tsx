import React from "react";
import classnames from "classnames";

import "./modal.sass";

interface IModalProps {
	className?: string,
	children?: any,
	isOpen?: boolean,
	toggle?: () => any,
}

function Modal({ className, children, isOpen, toggle }: IModalProps) {
	return (
		<div className={classnames("modal2", isOpen ? "modal2_open" : "")}>
			<div className={classnames("modal2__backdrop")} onClick={toggle} />
			<div className={classnames("modal2__content", className)}>{children}</div>
		</div>
	);
}

export default Modal;
