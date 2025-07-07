import { type ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { VideoJsPlayer } from "video.js";
import {
	getSavedAppPreferences,
	updateSavedAppPreferences,
} from "../../lib/storage";
import { SpeedIcon } from "../Icons";

type SpeedControlParams = {
	player: VideoJsPlayer | undefined;
};

export function SpeedControl(props: SpeedControlParams) {
	const { t } = useTranslation();
	const [preferredSpeed, setPreferredSpeed] = useState(1);

	async function setInitialPlayerSpeed() {
		const curAppState = await getSavedAppPreferences();
		if (!curAppState || !curAppState.preferredSpeed) return;
		setPreferredSpeed(curAppState.preferredSpeed);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: <biome was not correct on this>
	useEffect(() => {
		setInitialPlayerSpeed();
	}, []);
	async function handlePreferredSpeedChange(
		event: ChangeEvent<HTMLInputElement>,
	) {
		const player = props.player;
		const target = event.target as HTMLInputElement;
		if (!player) return;
		const amount = Number(target.value);

		player.playbackRate(amount);
		const curAppState = await getSavedAppPreferences();
		if (!curAppState) return;
		const newState = {
			...curAppState,
			preferredSpeed: amount,
		};
		await updateSavedAppPreferences(newState);

		const videoPlayerElement = document.querySelector("#vidJsPlayerContainer");
		if (videoPlayerElement) {
			const adjustPlayerSpeedEvent = new CustomEvent("adjustPlayerSpeed", {
				detail: {
					speed: amount,
				},
			});
			videoPlayerElement.dispatchEvent(adjustPlayerSpeedEvent);
		}
	}

	return (
		<div data-name="videoSpeedControl" className="mb-4">
			<p>{t("preferredVideoSpeed")}</p>
			<span className="inline-flex gap-1 items-center w-full">
				<input
					type="range"
					className="speedRange appearance-none bg-transparent cursor-pointer w-full! max-w-100 "
					min=".2"
					max="5"
					step=".1"
					value={preferredSpeed}
					onInput={(e) => {
						const target = e.target as HTMLInputElement;
						setPreferredSpeed(Number(target.value));
					}}
					onChange={(e) => {
						handlePreferredSpeedChange(e);
					}}
				/>
				<span className="inline-block h-5 w-5">
					<SpeedIcon />{" "}
				</span>
				<span className="inline-block ml-2">{preferredSpeed}</span>
			</span>
		</div>
	);
}
