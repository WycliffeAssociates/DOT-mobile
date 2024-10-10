import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import write_blob from "capacitor-blob-writer";
import type {
	IPlaylistData,
	IVidWithCustom,
	fetchSession,
	writeAnInProgressBlobParams,
} from "src/customTypes/types";
import type {
	IappState,
	validPlaylistSlugs,
	vidSavingWipData,
} from "../customTypes/types";
import { cacheBcPlaylistJson } from "./Ui";

const fsDirToUse = Directory.Documents;

export function makeVidSaver(
	playlist: validPlaylistSlugs,
	vid: IVidWithCustom,
) {
	// NOTE: We could change this, but 10 seems like a reasonsable amount for avoiding timeouts.
	// const increment = 1024 * 1000 * 10; //1 kilobyte * 1000 (= 1mb) * 10 = (10mb)
	const increment = 1024 * 300; //1kb * 250 = 300kb
	const mp4FileName = `${vid.id}_mp4`;

	function getAggregatedBlobPath() {
		return `${playlist}/${vid.id}/vid.mp4`;
	}
	function getInProgressDir() {
		return `${playlist}/${vid.id}/blobs_in_progress`;
	}

	return {
		ensurePlaylistDirExists: async () => {
			try {
				await Filesystem.mkdir({
					path: getInProgressDir(),
					recursive: true,
					directory: fsDirToUse,
				});
			} catch (error) {
				console.error(error);
				return null;
			}
		},
		getSmallestMp4: () => {
			const mp4Srces = vid.sources
				.filter(
					(source) =>
						source.container === "MP4" &&
						source.src.startsWith("https") &&
						source.size,
				)
				.sort((a, b) => {
					if (a.size && b.size) {
						return a.size - b.size;
					}
					return 0;
				});
			const lowestMp4Size = mp4Srces.length ? mp4Srces[0] : null;
			if (!lowestMp4Size) return; //shouldn't happen
			return lowestMp4Size;
		},
		async savePosterBlobAndGetSrc() {
			let posterBlob: Blob | undefined;
			const posterPath = `${playlist}/${vid.id}/poster.jpeg`;
			if (vid.poster) {
				try {
					const posterRes = await fetch(vid?.poster);
					posterBlob = await posterRes.blob();
				} catch (error) {
					console.warn(error);
				}
			}

			if (posterBlob) {
				await write_blob({
					path: posterPath,
					blob: posterBlob,
					directory: fsDirToUse,
					fast_mode: true,
					recursive: true,
					on_fallback(error) {
						console.error(error);
					},
				});
			}
			if (posterBlob) {
				const posterSrc = await Filesystem.getUri({
					path: posterPath,
					directory: fsDirToUse,
				});
				const mobileSrc = Capacitor.convertFileSrc(posterSrc.uri);
				return mobileSrc;
			}
		},
		getFileSize: async function get(url: string) {
			try {
				const res = await fetch(url, {
					method: "HEAD",
				});
				const contentLength = res.headers.get("Content-Length");

				if (contentLength === null) {
					return -1;
				}
				const fileSize = Number.parseInt(contentLength, 10);
				return fileSize;
			} catch (error) {
				console.warn(error);
			}
		},
		async calculateNeededRangesToFetch(fileSize: number) {
			const inProgressStringified = await Preferences.get({
				key: mp4FileName,
			});

			const inProgressData = inProgressStringified?.value
				? (JSON.parse(inProgressStringified.value) as vidSavingWipData)
				: null;
			const numberOfRangeFetches = Math.ceil(fileSize / increment);

			let chunksRequestsToMake = [];
			if (inProgressData) {
				chunksRequestsToMake = inProgressData.expected;
			} else {
				for (let i = 0; i < numberOfRangeFetches; i++) {
					const possibleEnd = i * increment + increment;
					const end = possibleEnd > fileSize ? fileSize : possibleEnd;
					const rangeRequestParams = {
						start: i === 0 ? 0 : i * increment + 1,
						end,
					};
					chunksRequestsToMake.push(rangeRequestParams);
				}
			}
			const allExpectedChunks = chunksRequestsToMake;
			if (inProgressData) {
				const pd = inProgressData; //assignemnt for ts : |
				chunksRequestsToMake = chunksRequestsToMake.filter(
					(requestLeftToMake) => {
						const stillNeedsFetching = pd.fetchesToMake.some(
							(fetchLeft: any) => {
								return (
									fetchLeft.start === requestLeftToMake.start &&
									fetchLeft.end === requestLeftToMake.end
								);
							},
						);
						return stillNeedsFetching;
					},
				);
			}
			const progressData = JSON.stringify({
				mp4FileName,
				fetchesToMake: chunksRequestsToMake,
				expected: allExpectedChunks,
			});
			await Preferences.set({
				key: mp4FileName,
				value: progressData,
			});
			return { chunksRequestsToMake, allExpectedChunks };
		},
		async getCurrentAmountFetched() {
			const inProgressStringified = await Preferences.get({
				key: mp4FileName,
			});

			const inProgressData = inProgressStringified?.value
				? (JSON.parse(inProgressStringified.value) as vidSavingWipData)
				: null;
			if (
				!inProgressData ||
				!inProgressData.expected?.length ||
				!inProgressData.fetchesToMake?.length
			)
				return 0;
			// e.g (20 - 5) / 20 = .75 -> * 100 = 75%
			return (
				(inProgressData.expected.length - inProgressData.fetchesToMake.length) /
				inProgressData.expected.length
			);
		},
		writeBlobChunk: async function writeBlobChunk({
			segmentToFetch,
			url,
		}: writeAnInProgressBlobParams) {
			const res = await fetchARange({
				url,
				start: segmentToFetch.start,
				end: segmentToFetch.end,
			});
			if (!res) {
				// ? Or continue?
				throw new Error("fetch A range went wrong");
			}
			const thisBlob = await res.blob();
			const inProgressPath = `${getInProgressDir()}/${segmentToFetch.start}_${
				segmentToFetch.end
			}.mp4`;
			await write_blob({
				path: inProgressPath,
				blob: thisBlob,
				directory: fsDirToUse,
				fast_mode: true,
				recursive: true,
				on_fallback(error) {
					console.error(error);
				},
			});
		},
		updateWipAndGetNewFetchSession: async function updateWipMeta(
			fetchSession: fetchSession,
		) {
			fetchSession.shift();
			const inProgressStringified = await Preferences.get({
				key: mp4FileName,
			});

			const inProgressData = inProgressStringified?.value
				? (JSON.parse(inProgressStringified.value) as vidSavingWipData)
				: null;
			if (!inProgressData) return;
			const newProgressData: vidSavingWipData = {
				mp4FileName,
				...inProgressData,
				fetchesToMake: fetchSession,
			};

			const asString = JSON.stringify(newProgressData);
			await Preferences.set({
				key: mp4FileName,
				value: asString,
			});
		},

		async aggregateWipBlobsIntoOneAndWriteFs(
			expectedChunks: {
				start: number;
				end: number;
			}[],
		) {
			try {
				const allPartialBlobs = await Filesystem.readdir({
					path: getInProgressDir(),
					directory: fsDirToUse,
				});

				const blobsToConcat = [];
				const allAccounted = expectedChunks.every((chunk) => {
					const matchingFile = allPartialBlobs.files.find((file) => {
						const withStartEnd = file.name.match(/(\d+)_(\d+)/);
						if (!withStartEnd || !withStartEnd[1] || !withStartEnd[2])
							return false;
						const start = Number(withStartEnd[1]);
						const end = Number(withStartEnd[2]);
						const matches = chunk.end === end && chunk.start === start;
						return matches;
					});
					return !!matchingFile;
				});
				// const allAccountedFor = allPartialBlobs.files.every((file) => {
				//   const withStartEnd = file.name.match(/(\d+)_(\d+)/);
				//   if (!withStartEnd || !withStartEnd[1] || !withStartEnd[2])
				//     return false;
				//   const start = Number(withStartEnd[1]);
				//   const end = Number(withStartEnd[2]);
				//   const isInExpected = expectedChunks.find(
				//     (chunk) => chunk.end === end && chunk.start === start
				//   );
				//   return isInExpected;
				// });
				if (!allAccounted)
					return {
						error: "not all accounted for",
						ok: false,
					};

				for await (const partialBlobPath of allPartialBlobs.files) {
					const itsPath = `${getInProgressDir()}/${partialBlobPath.name}`;
					const theBlobPart = await getBlobFromFs(itsPath);
					const withStartEnd = partialBlobPath.name.match(/(\d+)_(\d+)/);
					if (!withStartEnd || !withStartEnd[1] || !withStartEnd[2])
						return false;
					const start = Number(withStartEnd[1]);
					const end = Number(withStartEnd[2]);
					blobsToConcat.push({
						start,
						end,
						theBlobPart,
					});
				}
				const ensureSortedBlobs = blobsToConcat
					.sort((a, b) => {
						return a.start - b.start;
					})
					.map((blob) => blob.theBlobPart);

				const finalBlob = new Blob(ensureSortedBlobs, { type: "video/mp4" });

				await write_blob({
					path: getAggregatedBlobPath(),
					blob: finalBlob,
					directory: fsDirToUse,
					fast_mode: true,
					recursive: true,
					on_fallback(error) {
						console.error(error);
					},
				});
				return {
					ok: true,
				};
			} catch (error) {
				console.error(error);
				return {
					ok: false,
					error: error,
				};
			}
		},

		async getCapacitorSrcForFinalBlob() {
			const finalMp4Blob = await Filesystem.getUri({
				path: `${getAggregatedBlobPath()}`,
				directory: fsDirToUse,
			});

			const mp4DeviceSrc = Capacitor.convertFileSrc(finalMp4Blob.uri);
			return mp4DeviceSrc;
		},
		async deleteWipPrefsData() {
			try {
				await Preferences.remove({
					key: mp4FileName,
				});
			} catch (error) {
				console.error(error);
			}
		},
		async deleteWipChunkedVidBlobs() {
			await Filesystem.rmdir({
				path: getInProgressDir(),
				directory: fsDirToUse,
				recursive: true,
			});
		},
		async deleteAllVidData(playlistData: IPlaylistData, vid: IVidWithCustom) {
			// any in progress blobs and complete blobs under this video

			try {
				await Filesystem.rmdir({
					path: `${playlist}/${vid.id}`,
					directory: fsDirToUse,
					recursive: true,
				});
			} catch (err) {
				console.warn(err);
			} finally {
				// using the finally block since the rmdir might throw and negate rest. If a user wants to free this data, we are going to do it.
				await Preferences.remove({
					key: mp4FileName,
				});
				if (vid.book) {
					const playlistClone = JSON.parse(JSON.stringify(playlistData));
					const currentVidInThatClone = playlistClone.formattedVideos[
						vid.book
					].find((thisVid: IVidWithCustom) => thisVid.id === vid.id);
					if (currentVidInThatClone) {
						currentVidInThatClone.savedSources = undefined;
						await this.updateCachedPlaylist(playlistClone);
					}
				}
			}
		},
		// Remove from preferences, remove from cached playlist, remove final blob
		async updateCachedPlaylist(newPlaylist: IPlaylistData) {
			await cacheBcPlaylistJson({
				data: JSON.stringify(newPlaylist),
				playlistSlug: playlist,
			});
		},
	};
}

type fetchRangeParams = {
	url: string;
	start: number;
	end: number;
};

const fetchARange = async ({ url, start, end }: fetchRangeParams) => {
	// console.log(`Fetching ${start} to ${end}`);
	try {
		const rangeHeaders = new Headers();
		rangeHeaders.append("Range", `bytes=${start}-${end}`);

		const response = await fetch(url, {
			headers: rangeHeaders,
		});

		if (response.ok && response.body) {
			return response;
		}
		throw new Error("range fetch not ok");
	} catch (error) {
		console.error(error);
	}
};

const getBlobFromFs = async (path: string) => {
	const result = await Filesystem.readFile({
		path,
		directory: fsDirToUse,
	});
	if (Capacitor.getPlatform() !== "web") {
		const base64Response = await fetch(`data:video/mp4;base64,${result.data}`);
		const blob = await base64Response.blob();
		return blob;
	}
	return result.data;
};

export async function getSavedAppPreferences() {
	const alreadySavedState = await Preferences.get({
		key: "appState",
	});
	const stringifiedValue = alreadySavedState.value;

	const parsedState: {
		preferredSpeed: number;
	} | null = stringifiedValue ? JSON.parse(stringifiedValue) : null;

	return parsedState || null;
}
export async function updateSavedAppPreferences(payload: IappState) {
	const stringifiedValue = JSON.stringify(payload);
	await Preferences.set({
		key: "appState",
		value: stringifiedValue,
	});
}

// Things stored in preferences
/* 
1. ${playlist} = playlist json (bc/cached master)
2. WIP_saving  list of [`/playlist/${vidId}`]
3. ${vidId}_mp4 saved by chunk size of [{start, end}]
*/
/* 
Things stored in FS as blobs:
base dir = ${playlist}/${vidId}
1. ${playlist}/${vidId}/poster.jpeg
2. ${playlist}/${vidId}/blobs_in_progress/$start_$end.mp4
3. ${playlist}/${vidId}/vid.mp4
*/
