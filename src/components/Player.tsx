import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { VideoJsPlayer } from "video.js";
import { IVidWithCustom, chapterMarkers } from "../customTypes/types";
import { handleVideoJsTaps, playerCustomHotKeys } from "../lib/Ui";
import { getSavedAppPreferences } from "../lib/storage";
type Iplayer = {
	setPlayer: Dispatch<SetStateAction<VideoJsPlayer | undefined>>;
	existingPlayer: VideoJsPlayer | undefined;
	playlistData: Record<string, IVidWithCustom[]>;
	currentVid: IVidWithCustom;
	setJumpingForwardAmount: Dispatch<SetStateAction<string | number | null>>;
	setJumpingBackAmount: Dispatch<SetStateAction<string | number | null>>;
	handleChapters(
		vid: IVidWithCustom,
		vidJsPlayer: VideoJsPlayer | undefined,
	): Promise<chapterMarkers | undefined>;
};

export function VidJsPlayer({
	setPlayer,
	existingPlayer,
	playlistData,
	currentVid,
	setJumpingBackAmount,
	setJumpingForwardAmount,
	handleChapters,
}: Iplayer) {
	const vidPlayerRef = useRef(null);
	const vidJsPlayerContainerRef = useRef<HTMLDivElement>(null);

	async function bootPlayer() {
		if (playlistData) {
			const curAppState = await getSavedAppPreferences();
			// SPEED
			const preferredSpeed = curAppState?.preferredSpeed || 1;
			const jumpAmount = 5; //seconds to jump on double taps;
			const firstBook = currentVid;
			// Resume src, offline or stream
			const firstVidSrces = firstBook.savedSources?.video
				? {
						src: `${firstBook.savedSources?.video}`,
						type: "video/mp4",
				  }
				: firstBook.sources;

			const firstPoster = firstBook.savedSources?.poster
				? firstBook.savedSources?.poster
				: firstBook.poster;

			// instantiate player
			// window.bc is from /bc/willPlayer.  This is a brightcove player that has been manually downloaded and included to avoid the network request for a 200kb + video js player.  This allows us to bundle it for offline usage in mobile app more easily too.  We could just use video js, but the bundled / minified player includes brightcoves built in analytics. If we are offline, they won't send, but that's a noop at that point. The priority is availability.
			// SEe https://videojs.com/guides/options
			const player = window.bc(vidPlayerRef.current, {
				responsive: true,
				fluid: true,
				controls: true,
				playbackRates: [0.5, 1, 1.5, 2, 2.5],
				preload: "auto",
				autoplay: false,
				fullscreen: {
					navigationUI: "show",
				},
				enableDocumentPictureInPicture: true,
				sources: firstVidSrces,
				poster: firstPoster,
				nativeControlsForTouch: true,
			});

			player.playbackRate(preferredSpeed);
			player.on("loadstart", () => maintainPlayerSpeed(player));
			player.language(navigator.languages[0]);
			player.playsinline(true); //ios

			// Get initial chapters if present
			player.one("loadedmetadata", () => {
				handleChapters(currentVid, player);
			});

			const videoJsDomEl = player.el();
			// Handle mobile taps
			handleVideoJsTaps({
				el: videoJsDomEl,
				rightDoubleFxn(number) {
					const curTime = player?.currentTime();
					if (!curTime) return;
					// the extra minus jumpAmount on end of next line is to account for fact that min tap amount is 2 to diff btw double and single taps, so we still want to allow the smallest measure of jump back;
					const newTime = number * jumpAmount + curTime - jumpAmount;
					player?.currentTime(newTime);
					setJumpingForwardAmount(null);
					videoJsDomEl.classList.remove("vjs-user-active");
				},
				leftDoubleFxn(number) {
					const curTime = player?.currentTime();
					if (!curTime) return;

					const newTime = curTime - number * jumpAmount - jumpAmount;
					player?.currentTime(newTime);
					setJumpingBackAmount(null);
					videoJsDomEl.classList.remove("vjs-user-active");
				},
				singleTapFxn() {
					if (!player) return;
					if (player.paused()) {
						player.play();
					} else {
						player.pause();
					}
				},
				doubleTapUiClue(dir, tapsCount) {
					if (dir === "LEFT") {
						setJumpingBackAmount(tapsCount * jumpAmount - 5);
						setJumpingForwardAmount(null);
					} else if (dir === "RIGHT") {
						setJumpingBackAmount(null);
						setJumpingForwardAmount(tapsCount * jumpAmount - 5);
					}
				},
			});

			// @MANAGE KEYS TO SKIP
			player.on("keydown", (e: KeyboardEvent) =>
				playerCustomHotKeys({
					e,
					vjsPlayer: player,
					increment: jumpAmount,
					setJumpingBackAmount,
					setJumpingForwardAmount,
				}),
			);

			// Finally set state
			setPlayer(player);
		}
	}
	async function maintainPlayerSpeed(player: VideoJsPlayer) {
		if (vidJsPlayerContainerRef.current) {
			const curAppState = await getSavedAppPreferences();
			const preferredSpeed = curAppState?.preferredSpeed || 1;
			player.playbackRate(preferredSpeed);
		}
	}
	function handleSpeedChangesInApp() {
		if (vidJsPlayerContainerRef.current && existingPlayer) {
			vidJsPlayerContainerRef.current.addEventListener(
				"adjustPlayerSpeed",
				(event: Event) => {
					const customEvent = event as CustomEvent;

					if (
						customEvent.detail &&
						typeof customEvent.detail.speed === "number"
					) {
						const speed = customEvent.detail.speed;
						existingPlayer.playbackRate(speed);
					}
				},
			);
		}
	}

	useEffect(() => {
		bootPlayer();
	}, []);
	useEffect(() => {
		// a custom event dispatch listener
		handleSpeedChangesInApp();
	}, []);

	return (
		<div
			className="mx-auto absolute inset-0 "
			ref={vidJsPlayerContainerRef}
			id="vidJsPlayerContainer"
		>
			{playlistData && (
				// biome-ignore lint/a11y/useMediaCaption: captions provided through chap segments
				<video
					ref={vidPlayerRef}
					className="video-js object-cover absolute inset-0"
					controls
					src=""
				/>
			)}
		</div>
	);
}
