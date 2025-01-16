import type { IVidWithCustom, validPlaylistSlugs } from "../customTypes/types";

interface sortOrderI {
	[key: string]: number;
}

export const BibleBookCategories = {
	OT: [
		"GEN",
		"EXO",
		"LEV",
		"NUM",
		"DEU",
		"JOS",
		"JDG",
		"RUT",
		"1SA",
		"2SA",
		"1KI",
		"2KI",
		"1CH",
		"2CH",
		"EZR",
		"NEH",
		"EST",
		"JOB",
		"PSA",
		"PRO",
		"ECC",
		"SNG",
		"ISA",
		"JER",
		"LAM",
		"EZK",
		"DAN",
		"HOS",
		"JOL",
		"AMO",
		"OBA",
		"JON",
		"MIC",
		"NAM",
		"HAB",
		"ZEP",
		"HAG",
		"ZEC",
		"MAL",
	],
	NT: [
		"MAT",
		"MRK",
		"LUK",
		"JHN",
		"ACT",
		"ROM",
		"1CO",
		"2CO",
		"GAL",
		"EPH",
		"PHP",
		"COL",
		"1TH",
		"2TH",
		"1TI",
		"2TI",
		"TIT",
		"PHM",
		"HEB",
		"JAS",
		"1PE",
		"2PE",
		"1JN",
		"2JN",
		"3JN",
		"JUD",
		"REV",
	],
};

const bibleBookSortOrder = Object.values(BibleBookCategories)
	.flat()
	.reduce((acc: sortOrderI, value: string, index: number) => {
		acc[value] = index + 1;
		return acc;
	}, {});
export { bibleBookSortOrder };

export function getBibleBookSort(bookSlug: string) {
	const normalized = bookSlug.normalize().toUpperCase();
	const sortOrder = bibleBookSortOrder[normalized];
	return sortOrder;
}

export function convertToValidFilename(string: string) {
	return string.replace(/[\/|\\:*?"<>]/g, " ").replace(" ", "_");
}

export function normalizeBookName(bookname: string | undefined) {
	if (!bookname) return "";
	const parts = bookname.split(/(\d+)/).filter((r) => !!r); // Split on any digits
	if (parts.length > 1) {
		const secondPart = upperFirstLowerRest(parts[1]);
		return `${parts[0]} ${secondPart}`;
	}
	return upperFirstLowerRest(bookname);
}
export function upperFirstLowerRest(bookName: string) {
	return `${bookName.trim().slice(0, 1).toUpperCase()}${bookName
		.trim()
		.slice(1)
		.toLowerCase()}`;
}
// export function formatPlayListName(playlist: validPlaylistSlugs | undefined) {
// 	if (!playlist) return "";
// 	const parts = playlist.split("-");
// 	const cased = parts
// 		.map((part) => upperFirstLowerRest(part))
// 		.map((part) => (part.toLowerCase() === "nt" ? part.toUpperCase() : part));
// 	return cased.join(" ");
// }
export function convertTimeToSeconds(timeStr: string): number {
	const [mins, secs] = timeStr.split(":").map(Number);
	const milliseconds = Number(timeStr.split(".")[1]);
	return mins * 60 + secs + milliseconds / 1000;
}
export function bytesToMb(bytes: number | undefined) {
	if (!bytes) return "";
	const val = Math.round(bytes / 1000 / 1000);
	return String(val);
}

export function groupObjectsByKey<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends { [key: string]: any },
	K extends keyof T,
>(objects: T[], key: K): Record<T[K], T[]> {
	const groups = {} as Record<T[K], T[]>;

	for (const object of objects) {
		// Get the value of the specified key
		const value = object[key];

		// If there is no group for the value, create one
		if (!groups[value]) {
			groups[value] = [];
		}

		// Add the object to the corresponding group
		groups[value].push(object);
	}
	// Iterate over each object in the array

	return groups;
}

export function massageVidsArray(vids: IVidWithCustom[]) {
	type accType = {
		matching: IVidWithCustom[];
		notMatching: IVidWithCustom[];
	};
	const filteredByMatchingReferenceId = vids.reduce(
		(accumulator: accType, current) => {
			if (current.custom_fields?.book && current.custom_fields?.chapter) {
				accumulator.matching.push(current);
			} else {
				accumulator.notMatching.push(current);
			}
			return accumulator;
		},
		{
			matching: [],
			notMatching: [],
		},
	);

	const sortedVids = filteredByMatchingReferenceId.matching.sort((a, b) => {
		const aCustomBook = a.custom_fields?.book;
		const bCustomBook = b.custom_fields?.book;
		if (!aCustomBook || !bCustomBook) return 0;
		const aBookSort = getBibleBookSort(aCustomBook);
		const bBookSort = getBibleBookSort(bCustomBook);
		const aChap = Number(a.custom_fields?.chapter);
		const bChap = Number(b.custom_fields?.chapter);
		let retVal: number;
		if (aBookSort === bBookSort) {
			retVal = aChap < bChap ? -1 : aChap === bChap ? 0 : 1;
		} else {
			retVal = aBookSort < bBookSort ? -1 : aBookSort === bBookSort ? 0 : 1;
		}
		return retVal;
	});

	// for (const object of objects) {

	for (const [idx, vid] of sortedVids.entries()) {
		vid.originalIdx = idx;
		vid.slugName = convertToValidFilename(String(vid.name));
		vid.book = vid.custom_fields?.book?.toUpperCase();
		vid.chapter = vid.custom_fields?.chapter;
		vid.localizedBookName =
			vid.custom_fields?.localized_book_name ||
			vid.custom_fields?.book?.toUpperCase();
	}

	return { sortedVids, filteredByMatchingReferenceId };
}

export function formatDuration(milliseconds: number) {
	// Convert milliseconds to seconds
	const seconds = Math.floor(milliseconds / 1000);

	// Calculate hours, minutes, and remaining seconds
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	// Format the time string and trim leading zeros
	let timeString = "";

	if (hours > 0) {
		timeString = `${hours}:${minutes
			.toString()
			.padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	if (hours === 0 || minutes > 0) {
		timeString = `${minutes.toString().padStart(2, "0")}:${remainingSeconds
			.toString()
			.padStart(2, "0")}`;
	} else {
		timeString = `0:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	return timeString;
}

// export function throttle(cb: AnyFunction<any, any>, delay: number = 1000) {
//   let shouldWait = false;
//   let waitingArgs: any;
//   const timeoutFunc = () => {
//     if (waitingArgs == null) {
//       shouldWait = false;
//     } else {
//       cb(...waitingArgs);
//       waitingArgs = null;
//       setTimeout(timeoutFunc, delay);
//     }
//   };

//   return (...args: any) => {
//     if (shouldWait) {
//       waitingArgs = args;
//       return;
//     }

//     cb(...args);
//     shouldWait = true;
//     setTimeout(timeoutFunc, delay);
//   };
// }

export function reduceToLowestSize(list: number[]) {
	const totalSize = list.reduce((acc: number, curr) => {
		if (!curr) return acc;
		return acc + curr;
	}, 0);
	return totalSize;
}
