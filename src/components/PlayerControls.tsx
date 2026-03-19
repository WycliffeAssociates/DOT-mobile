import { IonIcon } from "@ionic/react";
import {
	contractOutline,
	ellipsisHorizontal,
	expandOutline,
	pause,
	play,
	playBack,
	playForward,
	tvOutline,
} from "ionicons/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import type { IVidWithCustom, IvidJsPlayer } from "../customTypes/types";
import {
	getSavedAppPreferences,
	updateSavedAppPreferences,
} from "../lib/storage";
import { formatDuration } from "../lib/utils";

type PlayerControlsProps = {
	player: IvidJsPlayer | undefined;
	currentVid: IVidWithCustom;
};

type QualityOption = {
	label: string;
	levels: number[];
	sortValue: number;
};

type QualityApi = {
	length: number;
	selectedIndex: number;
	on?: (event: string, handler: () => void) => void;
	off?: (event: string, handler: () => void) => void;
	[index: number]: {
		height?: number;
		bitrate?: number;
		enabled: boolean;
	};
};

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 2.5];

function getVideoElement(player: IvidJsPlayer | undefined) {
	return player?.el()?.querySelector("video") as HTMLVideoElement | null;
}

function getBufferedEnd(player: IvidJsPlayer | undefined) {
	if (!player) return 0;
	const buffered = player.buffered();
	if (!buffered || buffered.length === 0) return 0;
	return buffered.end(buffered.length - 1);
}

function getQualityApi(player: IvidJsPlayer | undefined) {
	return (
		player as IvidJsPlayer & { qualityLevels?: () => QualityApi }
	)?.qualityLevels?.();
}

function getQualityOptions(player: IvidJsPlayer | undefined) {
	const qualityApi = getQualityApi(player);
	if (!qualityApi || qualityApi.length === 0) return [];

	const optionsMap = new Map<string, QualityOption>();
	for (let idx = 0; idx < qualityApi.length; idx += 1) {
		const level = qualityApi[idx];
		if (!level) continue;
		const label =
			typeof level.height === "number" && level.height > 0
				? `${level.height}p`
				: level.bitrate
					? `${Math.round(level.bitrate / 1000)} kbps`
					: `Level ${idx + 1}`;
		const sortValue = level.height || level.bitrate || idx;
		const existing = optionsMap.get(label);
		if (existing) {
			existing.levels.push(idx);
			existing.sortValue = Math.max(existing.sortValue, sortValue);
		} else {
			optionsMap.set(label, { label, levels: [idx], sortValue });
		}
	}

	return [...optionsMap.values()].sort((a, b) => b.sortValue - a.sortValue);
}

function getSelectedQualityLabel(
	player: IvidJsPlayer | undefined,
	options: QualityOption[],
) {
	const qualityApi = getQualityApi(player);
	if (!qualityApi || qualityApi.length === 0) return "Auto";

	const enabledLevels = new Set<number>();
	for (let idx = 0; idx < qualityApi.length; idx += 1) {
		if (qualityApi[idx]?.enabled) {
			enabledLevels.add(idx);
		}
	}
	if (enabledLevels.size === 0 || enabledLevels.size === qualityApi.length) {
		return "Auto";
	}

	for (const option of options) {
		const matchesOption = option.levels.every((levelIdx) =>
			enabledLevels.has(levelIdx),
		);
		if (!matchesOption) continue;
		const hasOnlyOptionLevels = [...enabledLevels].every((levelIdx) =>
			option.levels.includes(levelIdx),
		);
		if (hasOnlyOptionLevels) return option.label;
	}
	return "Auto";
}

export function PlayerControls({ player, currentVid }: PlayerControlsProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [bufferedEnd, setBufferedEnd] = useState(0);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isPipSupported, setIsPipSupported] = useState(false);
	const [isInPip, setIsInPip] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [preferredSpeed, setPreferredSpeed] = useState(1);
	const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
	const [selectedQualityLabel, setSelectedQualityLabel] = useState("Auto");
	const menuRef = useRef<HTMLDivElement>(null);
	const seekRailRef = useRef<HTMLDivElement>(null);
	const [isDraggingThumb, setIsDraggingThumb] = useState(false);

	const chapterMarkers = currentVid.chapterMarkers || [];

	const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
	const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
	const clampedPlayedPercent = Math.min(Math.max(playedPercent, 0), 100);
	const clampedBufferedPercent = Math.min(Math.max(bufferedPercent, 0), 100);

	const progressText = useMemo(() => {
		const start = formatDuration(currentTime * 1000);
		const end = formatDuration(duration * 1000);
		return `${start} / ${end}`;
	}, [currentTime, duration]);

	useEffect(() => {
		let isMounted = true;
		async function loadPreferredSpeed() {
			const appState = await getSavedAppPreferences();
			if (!isMounted) return;
			setPreferredSpeed(
				appState?.preferredSpeed || player?.playbackRate() || 1,
			);
		}
		loadPreferredSpeed();
		return () => {
			isMounted = false;
		};
	}, [player]);

	useEffect(() => {
		if (!player) return;
		getQualityApi(player);

		const syncState = () => {
			setIsPlaying(!player.paused());
			setCurrentTime(player.currentTime() || 0);
			setDuration(player.duration() || 0);
			setBufferedEnd(getBufferedEnd(player));
			setIsFullscreen(player.isFullscreen?.() || false);
			const options = getQualityOptions(player);
			setQualityOptions(options);
			setSelectedQualityLabel(getSelectedQualityLabel(player, options));
			const videoEl = getVideoElement(player);
			setIsPipSupported(
				Boolean(
					videoEl &&
						document.pictureInPictureEnabled &&
						!videoEl.disablePictureInPicture &&
						typeof videoEl.requestPictureInPicture === "function",
				),
			);
			setIsInPip(Boolean(document.pictureInPictureElement === videoEl));
		};

		const handleFullscreenChange = () => {
			setIsFullscreen(player.isFullscreen?.() || false);
		};
		const handlePipChange = () => {
			const videoEl = getVideoElement(player);
			setIsInPip(Boolean(document.pictureInPictureElement === videoEl));
		};
		const qualityApi = getQualityApi(player);

		syncState();
		player.on("play", syncState);
		player.on("pause", syncState);
		player.on("timeupdate", syncState);
		player.on("durationchange", syncState);
		player.on("loadedmetadata", syncState);
		player.on("progress", syncState);
		player.on("ratechange", syncState);
		player.on("fullscreenchange", handleFullscreenChange);
		player.on("loadstart", syncState);
		qualityApi?.on?.("change", syncState);
		qualityApi?.on?.("addqualitylevel", syncState);
		qualityApi?.on?.("removequalitylevel", syncState);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("enterpictureinpicture", handlePipChange);
		document.addEventListener("leavepictureinpicture", handlePipChange);

		return () => {
			player.off("play", syncState);
			player.off("pause", syncState);
			player.off("timeupdate", syncState);
			player.off("durationchange", syncState);
			player.off("loadedmetadata", syncState);
			player.off("progress", syncState);
			player.off("ratechange", syncState);
			player.off("fullscreenchange", handleFullscreenChange);
			player.off("loadstart", syncState);
			qualityApi?.off?.("change", syncState);
			qualityApi?.off?.("addqualitylevel", syncState);
			qualityApi?.off?.("removequalitylevel", syncState);
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener("enterpictureinpicture", handlePipChange);
			document.removeEventListener("leavepictureinpicture", handlePipChange);
		};
	}, [player, currentVid.id]);

	useEffect(() => {
		if (!menuOpen) return;
		function handleOutsideClick(event: MouseEvent) {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleOutsideClick);
		return () => {
			document.removeEventListener("mousedown", handleOutsideClick);
		};
	}, [menuOpen]);

	async function handleSpeedChange(speed: number) {
		if (!player) return;
		player.playbackRate(speed);
		setPreferredSpeed(speed);
		const appState = await getSavedAppPreferences();
		await updateSavedAppPreferences({
			...(appState || {}),
			preferredSpeed: speed,
		});
		setMenuOpen(false);
	}

	function handleQualityChange(label: string) {
		const qualityApi = getQualityApi(player);
		if (!qualityApi) return;

		if (label === "Auto") {
			for (let idx = 0; idx < qualityApi.length; idx += 1) {
				qualityApi[idx].enabled = true;
			}
		} else {
			const targetOption = qualityOptions.find(
				(option) => option.label === label,
			);
			if (!targetOption) return;
			for (let idx = 0; idx < qualityApi.length; idx += 1) {
				qualityApi[idx].enabled = targetOption.levels.includes(idx);
			}
		}
		setSelectedQualityLabel(label);
		setMenuOpen(false);
	}

	function togglePlay() {
		if (!player) return;
		if (player.paused()) {
			void player.play();
			return;
		}
		player.pause();
	}

	function seekBy(amount: number) {
		if (!player) return;
		const nextTime = Math.max(
			0,
			Math.min((player.currentTime() || 0) + amount, player.duration() || 0),
		);
		player.currentTime(nextTime);
	}

	function handleSeek(nextValue: number) {
		if (!player || !Number.isFinite(nextValue)) return;
		player.currentTime(nextValue);
		setCurrentTime(nextValue);
	}

	function updateFromClientX(clientX: number) {
		if (!player || !seekRailRef.current || !duration) return;
		const rect = seekRailRef.current.getBoundingClientRect();
		const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
		const nextTime = ratio * duration;
		player.currentTime(nextTime);
		setCurrentTime(nextTime);
	}

	function handleSeekRailPointerDown(
		event: React.PointerEvent<HTMLDivElement>,
	) {
		if (!player || !seekRailRef.current || !duration) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		updateFromClientX(event.clientX);
		setIsDraggingThumb(true);
	}

	function handleSeekRailPointerMove(
		event: React.PointerEvent<HTMLDivElement>,
	) {
		if (!isDraggingThumb) return;
		updateFromClientX(event.clientX);
	}

	function handleSeekRailPointerUp(event: React.PointerEvent<HTMLDivElement>) {
		if (!isDraggingThumb) return;
		updateFromClientX(event.clientX);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setIsDraggingThumb(false);
	}

	async function togglePictureInPicture() {
		const videoEl = getVideoElement(player);
		if (!videoEl || !isPipSupported) return;
		if (document.pictureInPictureElement === videoEl) {
			await document.exitPictureInPicture();
			return;
		}
		await videoEl.requestPictureInPicture();
	}

	function toggleFullscreen() {
		if (!player) return;
		if (player.isFullscreen?.()) {
			player.exitFullscreen?.();
			return;
		}
		player.requestFullscreen?.();
	}

	return (
		<div className="custom-player-controls relative z-40 bg-[#173544] text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
			<div className="flex items-center gap-0.5 px-2 py-1.5 text-white md:gap-2 md:px-3 md:py-2">
				<button
					type="button"
					className="grid h-8 w-8 place-content-center rounded-full text-[1.05rem] text-white transition hover:bg-white/10 md:h-9 md:w-9"
					onClick={togglePlay}
					aria-label={isPlaying ? "Pause video" : "Play video"}
				>
					<IonIcon icon={isPlaying ? pause : play} />
				</button>
				<button
					type="button"
					className="grid h-8 w-8 place-content-center rounded-full text-[1rem] text-white transition hover:bg-white/10 md:h-9 md:w-9"
					onClick={() => seekBy(-5)}
					aria-label="Seek backward 5 seconds"
				>
					<IonIcon icon={playBack} />
				</button>
				<button
					type="button"
					className="grid h-8 w-8 place-content-center rounded-full text-[1rem] text-white transition hover:bg-white/10 md:h-9 md:w-9"
					onClick={() => seekBy(5)}
					aria-label="Seek forward 5 seconds"
				>
					<IonIcon icon={playForward} />
				</button>
				<span className="min-w-0 flex-1 truncate pl-1 text-[0.78rem] font-semibold tabular-nums text-white/90 md:pl-0 md:text-sm">
					{progressText}
				</span>
				{isPipSupported && (
					<button
						type="button"
						className={`grid h-8 w-8 place-content-center rounded-full text-[0.95rem] text-white transition hover:bg-white/10 md:h-9 md:w-9 ${
							isInPip ? "bg-white/15" : ""
						}`}
						onClick={() => void togglePictureInPicture()}
						aria-label="Toggle picture in picture"
					>
						<IonIcon icon={tvOutline} />
					</button>
				)}
				<button
					type="button"
					className="grid h-8 w-8 place-content-center rounded-full text-[0.95rem] text-white transition hover:bg-white/10 md:h-9 md:w-9"
					onClick={toggleFullscreen}
					aria-label="Toggle fullscreen"
				>
					<IonIcon icon={isFullscreen ? contractOutline : expandOutline} />
				</button>
				<div className="relative" ref={menuRef}>
					<button
						type="button"
						className="grid h-8 w-8 place-content-center rounded-full text-[1rem] text-white transition hover:bg-white/10 md:h-9 md:w-9"
						onClick={() => setMenuOpen((open) => !open)}
						aria-label="Player settings"
					>
						<IonIcon icon={ellipsisHorizontal} />
					</button>
					{menuOpen && (
						<div className="absolute right-0 top-[calc(100%+0.35rem)] z-[120] w-56 rounded-xl bg-[#102834] p-2.5 text-white shadow-xl ring-1 ring-white/10 md:top-[calc(100%+0.5rem)] md:w-60 md:p-3">
							<div className="mb-2.5 md:mb-3">
								<div className="mb-2 flex items-center justify-between gap-3">
									<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 md:text-xs md:tracking-[0.18em]">
										Speed
									</p>
									<span className="rounded-full bg-white/10 px-2 py-0.75 text-[11px] font-semibold text-white/85 md:py-1 md:text-xs">
										{preferredSpeed}x
									</span>
								</div>
								<div className="flex flex-wrap gap-1.5 md:gap-2">
									{SPEED_OPTIONS.map((speed) => (
										<button
											key={speed}
											type="button"
											className={`rounded-full px-2.5 py-0.75 text-[13px] transition md:px-3 md:py-1 md:text-sm ${
												preferredSpeed === speed
													? "bg-primary text-white"
													: "bg-white/8 text-white/85 hover:bg-white/15"
											}`}
											onClick={() => void handleSpeedChange(speed)}
										>
											{speed}x
										</button>
									))}
								</div>
							</div>
							{qualityOptions.length > 0 && (
								<div>
									<div className="mb-2 flex items-center justify-between gap-3">
										<p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60 md:text-xs md:tracking-[0.18em]">
											Quality
										</p>
										<span className="rounded-full bg-white/10 px-2 py-0.75 text-[11px] font-semibold text-white/85 md:py-1 md:text-xs">
											{selectedQualityLabel}
										</span>
									</div>
									<div className="flex flex-wrap gap-1.5 md:gap-2">
										<button
											type="button"
											className={`rounded-full px-2.5 py-0.75 text-[13px] transition md:px-3 md:py-1 md:text-sm ${
												selectedQualityLabel === "Auto"
													? "bg-primary text-white"
													: "bg-white/8 text-white/85 hover:bg-white/15"
											}`}
											onClick={() => handleQualityChange("Auto")}
										>
											Auto
										</button>
										{qualityOptions.map((option) => (
											<button
												key={option.label}
												type="button"
												className={`rounded-full px-2.5 py-0.75 text-[13px] transition md:px-3 md:py-1 md:text-sm ${
													selectedQualityLabel === option.label
														? "bg-primary text-white"
														: "bg-white/8 text-white/85 hover:bg-white/15"
												}`}
												onClick={() => handleQualityChange(option.label)}
											>
												{option.label}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="px-2 pb-2.5 pt-0.5 md:px-3 md:pb-3 md:pt-1">
				<div
					ref={seekRailRef}
					className="relative h-8 cursor-pointer touch-none md:h-9"
					onPointerDown={handleSeekRailPointerDown}
					onPointerMove={handleSeekRailPointerMove}
					onPointerUp={handleSeekRailPointerUp}
					onPointerCancel={handleSeekRailPointerUp}
					role="slider"
					tabIndex={0}
					aria-label="Video progress"
					aria-valuemin={0}
					aria-valuemax={duration || 0}
					aria-valuenow={Math.min(currentTime, duration || 0)}
				>
					<div className="absolute left-0 right-0 top-1/2 h-1.75 -translate-y-1/2 rounded-full border border-white/35 bg-[#2e4651] md:h-2" />
					<div
						className="absolute left-0 top-1/2 h-1.75 -translate-y-1/2 rounded-full bg-white/25 md:h-2"
						style={{ width: `${clampedBufferedPercent}%` }}
					/>
					<div
						className="absolute left-0 top-1/2 h-1.75 -translate-y-1/2 rounded-full bg-primary md:h-2"
						style={{ width: `${clampedPlayedPercent}%` }}
					/>
					{chapterMarkers.map((marker) => {
						const markerText = marker.startVerse || "";
						const markerLabel =
							marker.startVerse && marker.endVerse
								? `Verses ${marker.startVerse}-${marker.endVerse}`
								: marker.startVerse
									? `Verse ${marker.startVerse}`
									: marker.label;
						return (
							<button
								key={`${marker.chapterStart}-${marker.xPos}`}
								type="button"
								className="absolute top-1/2 z-20 grid h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border border-white/95 bg-white! px-1 text-[9px] leading-none font-bold text-primary shadow md:h-6 md:min-w-6 md:text-[10px]"
								style={{ left: `${marker.xPos}%` }}
								onPointerDown={(event) => {
									event.stopPropagation();
								}}
								onClick={() => handleSeek(marker.chapterStart)}
								title={markerLabel}
								aria-label={markerLabel}
							>
								{markerText}
							</button>
						);
					})}
					<div
						className="pointer-events-none absolute top-1/2 z-30 h-6.5 w-6.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-3 border-white bg-primary shadow-[0_0_0_5px_rgba(255,255,255,0.22)] md:h-8 md:w-8 md:shadow-[0_0_0_6px_rgba(255,255,255,0.22)]"
						style={{ left: `${clampedPlayedPercent}%` }}
						aria-hidden="true"
					/>
				</div>
			</div>
		</div>
	);
}
