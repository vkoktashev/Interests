import { useEffect, useRef } from "react";

export default function useScroll(parentRef, childRef, callback) {
	const observer = useRef<any>();

	useEffect(() => {
		const options = {
			root: parentRef.current,
			rootMargin: "0px",
			threshold: 0,
		};
		observer.current = new IntersectionObserver(([target]) => {
			if (target.isIntersecting) {
				callback();
			}
		}, options);

		observer.current.observe(childRef.current);

		return function () {
			// eslint-disable-next-line
			observer.current.unobserve(childRef.current);
		};
		// eslint-disable-next-line
	}, [callback]);
}
