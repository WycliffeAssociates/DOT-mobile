import type { SVGProps } from "react";

interface IconProps {
	classNames?: string;
}

export function DotLogo() {
	return <img src="/assets/logos/no-background-plain.webp" alt="" />;
}

export function IconMaterialSymbolsChevronLeft(props: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<title>Chevron Left</title>
			<path
				fill="currentColor"
				d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6L14 18Z"
			/>
		</svg>
	);
}

export function IconMaterialSymbolsChevronRight(props: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<title>Chevron Right</title>

			<path
				fill="currentColor"
				d="M9.4 18L8 16.6l4.6-4.6L8 7.4L9.4 6l6 6l-6 6Z"
			/>
		</svg>
	);
}

export function IconChapBack(props: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			className={`${props.classNames}`}
		>
			<title>Chapter Back</title>
			<path
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M20 5v14L8 12zM4 5v14"
			/>
		</svg>
	);
}

export function IconChapNext(props: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			className={`${props.classNames}`}
		>
			<title>Chapter Next</title>

			<path
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M4 5v14l12-7zm16 0v14"
			/>
		</svg>
	);
}

export function IconMaterialSymbolsDownloadForOfflineRounded(
	props: SVGProps<SVGSVGElement>,
) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<title>Download Offline</title>

			<path
				fill="currentColor"
				d="M8 17h8q.425 0 .713-.288T17 16q0-.425-.288-.713T16 15H8q-.425 0-.713.288T7 16q0 .425.288.713T8 17Zm3-6.85l-.9-.875Q9.825 9 9.412 9t-.712.3q-.275.275-.275.7t.275.7l2.6 2.6q.3.3.7.3t.7-.3l2.6-2.6q.275-.275.287-.688T15.3 9.3q-.275-.275-.688-.288t-.712.263l-.9.875V7q0-.425-.288-.713T12 6q-.425 0-.713.288T11 7v3.15ZM12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"
			/>
		</svg>
	);
}

export function SpeedIcon(props: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="100%"
			height="100%"
			viewBox="0 0 24 24"
			className={`${props.classNames}`}
		>
			<title>Speed Control</title>

			<path
				fill="currentColor"
				d="m20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1a10 10 0 0 0-.27-10.44z"
			/>
			<path
				fill="currentColor"
				d="M10.59 15.41a2 2 0 0 0 2.83 0l5.66-8.49l-8.49 5.66a2 2 0 0 0 0 2.83z"
			/>
		</svg>
	);
}

export function IconMaterialSymbolsCheckCircle(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}
		>
			<title>Check Circle</title>

			<path
				fill="currentColor"
				d="m10.6 16.6l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4l4.25 4.25ZM12 22q-2.075 0-3.9-.788t-3.175-2.137q-1.35-1.35-2.137-3.175T2 12q0-2.075.788-3.9t2.137-3.175q1.35-1.35 3.175-2.137T12 2q2.075 0 3.9.788t3.175 2.137q1.35 1.35 2.138 3.175T22 12q0 2.075-.788 3.9t-2.137 3.175q-1.35 1.35-3.175 2.138T12 22Z"
			/>
		</svg>
	);
}
export function ArrowBack() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
		>
			<title>Arrow Back</title>
			<path
				d="M18.0374 10.5166H7.28489L11.9825 5.69276C12.3579 5.30724 12.3579 4.6746 11.9825 4.28908C11.8934 4.19744 11.7877 4.12474 11.6712 4.07514C11.5547 4.02553 11.4299 4 11.3038 4C11.1778 4 11.0529 4.02553 10.9365 4.07514C10.82 4.12474 10.7142 4.19744 10.6252 4.28908L4.28151 10.8033C4.19227 10.8948 4.12148 11.0034 4.07317 11.123C4.02486 11.2426 4 11.3707 4 11.5002C4 11.6297 4.02486 11.7579 4.07317 11.8774C4.12148 11.997 4.19227 12.1057 4.28151 12.1971L10.6252 18.7113C10.7143 18.8029 10.8201 18.8755 10.9366 18.925C11.053 18.9745 11.1778 19 11.3038 19C11.4299 19 11.5547 18.9745 11.6711 18.925C11.7876 18.8755 11.8934 18.8029 11.9825 18.7113C12.0716 18.6198 12.1423 18.5112 12.1905 18.3916C12.2388 18.272 12.2636 18.1439 12.2636 18.0144C12.2636 17.885 12.2388 17.7569 12.1905 17.6373C12.1423 17.5177 12.0716 17.4091 11.9825 17.3175L7.28489 12.4937H18.0374C18.5668 12.4937 19 12.0488 19 11.5052C19 10.9615 18.5668 10.5166 18.0374 10.5166Z"
				fill="#121212"
			/>
		</svg>
	);
}
export function DownloadArrowDown() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="12"
			height="15"
			viewBox="0 0 12 15"
			fill="none"
		>
			<title> Download Arrow </title>
			<path
				d="M1.62164 13.0954H10.3784M2.10813 6.77111L6.00002 10.1765M6.00002 10.1765L9.89191 6.77111M6.00002 10.1765V1.90625"
				stroke="#121212"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
export function IconCancelX(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="25"
			viewBox="0 0 24 25"
			fill="none"
			{...props}
		>
			<title>Cancel </title>

			<path
				fill="currentColor"
				d="M19.546 18.4547C19.7573 18.6661 19.876 18.9527 19.876 19.2516C19.876 19.5505 19.7573 19.8371 19.546 20.0485C19.3346 20.2598 19.048 20.3785 18.7491 20.3785C18.4502 20.3785 18.1636 20.2598 17.9522 20.0485L12 14.0944L6.04596 20.0466C5.83461 20.2579 5.54797 20.3767 5.24908 20.3767C4.9502 20.3767 4.66355 20.2579 4.45221 20.0466C4.24086 19.8352 4.12213 19.5486 4.12213 19.2497C4.12213 18.9508 4.24086 18.6642 4.45221 18.4528L10.4063 12.5007L4.45408 6.54659C4.24274 6.33525 4.12401 6.0486 4.12401 5.74972C4.12401 5.45083 4.24274 5.16418 4.45408 4.95284C4.66543 4.7415 4.95207 4.62276 5.25096 4.62276C5.54984 4.62276 5.83649 4.7415 6.04783 4.95284L12 10.9069L17.9541 4.9519C18.1654 4.74056 18.4521 4.62183 18.751 4.62183C19.0498 4.62183 19.3365 4.74056 19.5478 4.9519C19.7592 5.16325 19.8779 5.44989 19.8779 5.74878C19.8779 6.04766 19.7592 6.33431 19.5478 6.54565L13.5938 12.5007L19.546 18.4547Z"
			/>
		</svg>
	);
}
// export function
