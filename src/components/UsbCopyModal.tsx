import {
	IonButton,
	IonButtons,
	IonContent,
	IonFooter,
	IonHeader,
	IonModal,
	IonSpinner,
	IonTitle,
	IonToolbar,
} from "@ionic/react";
import { useEffect, useState } from "react";
import { UsbStorage } from "../plugins/UsbStorage";

type LanguageEntry = { playlist: string; display: string };

type ChapterState = { chapter: string; selected: boolean };
type BookState = {
	book: string;
	selected: boolean;
	indeterminate: boolean;
	expanded: boolean;
	chapters: ChapterState[];
};
type LanguageState = {
	entry: LanguageEntry;
	selected: boolean;
	indeterminate: boolean;
	expanded: boolean;
	books: BookState[];
	loading: boolean;
};

type Props = {
	isOpen: boolean;
	treeUri: string;
	matchedEntries: LanguageEntry[];
	onClose: () => void;
	onCopyDone: (count: number) => void;
};

// Canonical NT book order for sorting; falls back to alphabetical for unknowns.
const NT_BOOK_ORDER = [
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
];

function sortBooks(books: string[]): string[] {
	return [...books].sort((a, b) => {
		const ai = NT_BOOK_ORDER.indexOf(a);
		const bi = NT_BOOK_ORDER.indexOf(b);
		if (ai !== -1 && bi !== -1) return ai - bi;
		if (ai !== -1) return -1;
		if (bi !== -1) return 1;
		return a.localeCompare(b);
	});
}

export function UsbCopyModal({
	isOpen,
	treeUri,
	matchedEntries,
	onClose,
	onCopyDone,
}: Props) {
	const [languages, setLanguages] = useState<LanguageState[]>([]);
	const [copying, setCopying] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setCopying(false);
		setLanguages(
			matchedEntries.map((entry) => ({
				entry,
				selected: true,
				indeterminate: false,
				expanded: false,
				books: [],
				loading: false,
			})),
		);
	}, [isOpen, matchedEntries]);

	async function expandLanguage(langIdx: number) {
		const lang = languages[langIdx];
		if (lang.books.length > 0 || lang.loading) {
			// Already scanned — just toggle expand
			setLanguages((prev) =>
				prev.map((l, i) =>
					i === langIdx ? { ...l, expanded: !l.expanded } : l,
				),
			);
			return;
		}
		setLanguages((prev) =>
			prev.map((l, i) =>
				i === langIdx ? { ...l, expanded: true, loading: true } : l,
			),
		);
		try {
			const { videos } = await UsbStorage.scanAvailableVideos({
				treeUri,
				playlist: lang.entry.playlist,
			});
			const bookMap = new Map<string, string[]>();
			for (const { book, chapter } of videos) {
				if (!bookMap.has(book)) bookMap.set(book, []);
				bookMap.get(book)?.push(chapter);
			}
			const books: BookState[] = sortBooks([...bookMap.keys()]).map((book) => ({
				book,
				selected: true,
				indeterminate: false,
				expanded: false,
				chapters: (bookMap.get(book) ?? [])
					.sort((a, b) => Number(a) - Number(b))
					.map((chapter) => ({ chapter, selected: true })),
			}));
			setLanguages((prev) =>
				prev.map((l, i) =>
					i === langIdx ? { ...l, loading: false, books } : l,
				),
			);
		} catch {
			setLanguages((prev) =>
				prev.map((l, i) =>
					i === langIdx ? { ...l, loading: false, expanded: false } : l,
				),
			);
		}
	}

	function toggleBook(langIdx: number, bookIdx: number) {
		setLanguages((prev) =>
			prev.map((l, i) => {
				if (i !== langIdx) return l;
				const books = l.books.map((b, j) => {
					if (j !== bookIdx) return b;
					const selected = !b.selected;
					return {
						...b,
						selected,
						indeterminate: false,
						chapters: b.chapters.map((c) => ({ ...c, selected })),
					};
				});
				const allSel = books.every((b) => b.selected);
				const noneSel = books.every((b) => !b.selected && !b.indeterminate);
				return {
					...l,
					books,
					selected: allSel,
					indeterminate: !allSel && !noneSel,
				};
			}),
		);
	}

	function toggleChapter(langIdx: number, bookIdx: number, chapIdx: number) {
		setLanguages((prev) =>
			prev.map((l, i) => {
				if (i !== langIdx) return l;
				const books = l.books.map((b, j) => {
					if (j !== bookIdx) return b;
					const chapters = b.chapters.map((c, k) =>
						k === chapIdx ? { ...c, selected: !c.selected } : c,
					);
					const allSel = chapters.every((c) => c.selected);
					const noneSel = chapters.every((c) => !c.selected);
					return {
						...b,
						chapters,
						selected: allSel,
						indeterminate: !allSel && !noneSel,
					};
				});
				const allSel = books.every((b) => b.selected);
				const noneSel = books.every((b) => !b.selected && !b.indeterminate);
				return {
					...l,
					books,
					selected: allSel,
					indeterminate: !allSel && !noneSel,
				};
			}),
		);
	}

	function toggleLanguage(langIdx: number) {
		setLanguages((prev) =>
			prev.map((l, i) => {
				if (i !== langIdx) return l;
				const selected = !l.selected;
				return {
					...l,
					selected,
					indeterminate: false,
					books: l.books.map((b) => ({
						...b,
						selected,
						indeterminate: false,
						chapters: b.chapters.map((c) => ({ ...c, selected })),
					})),
				};
			}),
		);
	}

	function setBookExpanded(
		langIdx: number,
		bookIdx: number,
		expanded: boolean,
	) {
		setLanguages((prev) =>
			prev.map((l, i) =>
				i !== langIdx
					? l
					: {
							...l,
							books: l.books.map((b, j) =>
								j === bookIdx ? { ...b, expanded } : b,
							),
						},
			),
		);
	}

	async function handleCopy() {
		setCopying(true);
		let totalCopied = 0;

		for (const lang of languages) {
			if (!lang.selected && !lang.indeterminate) continue;

			if (lang.books.length === 0) {
				// Never expanded — copy entire playlist
				try {
					const { filesCopied } = await UsbStorage.copyUsbPlaylist({
						treeUri,
						playlist: lang.entry.playlist,
					});
					totalCopied += filesCopied;
				} catch (e) {
					console.warn("copyUsbPlaylist failed", lang.entry.playlist, e);
				}
				continue;
			}

			const items = lang.books.flatMap((b) =>
				b.chapters
					.filter((c) => c.selected)
					.map((c) => ({ book: b.book, chapter: c.chapter })),
			);
			if (items.length === 0) continue;

			try {
				const { filesCopied } = await UsbStorage.copyUsbChapters({
					treeUri,
					playlist: lang.entry.playlist,
					items,
				});
				totalCopied += filesCopied;
			} catch (e) {
				console.warn("copyUsbChapters failed", lang.entry.playlist, e);
			}
		}

		setCopying(false);
		onCopyDone(totalCopied);
	}

	// Count selected chapters; for unexpanded languages count as 1 unit so the
	// button is still enabled.
	const selectedCount = languages.reduce((sum, l) => {
		if (!l.selected && !l.indeterminate) return sum;
		if (l.books.length === 0) return sum + (l.selected ? 1 : 0);
		return (
			sum +
			l.books.reduce(
				(s, b) => s + b.chapters.filter((c) => c.selected).length,
				0,
			)
		);
	}, 0);

	return (
		<IonModal
			isOpen={isOpen}
			onDidDismiss={onClose}
			style={{ "--height": "80%" }}
		>
			<IonHeader>
				<IonToolbar>
					<IonTitle>Copy to Device</IonTitle>
				</IonToolbar>
			</IonHeader>

			<IonContent>
				{copying ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							height: "100%",
							gap: "1rem",
						}}
					>
						<IonSpinner />
						<p>Copying videos to device…</p>
					</div>
				) : (
					<div style={{ padding: "8px 0" }}>
						{languages.map((lang, langIdx) => (
							<div key={lang.entry.playlist}>
								{/* Language row */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										padding: "12px 16px",
										borderBottom: "1px solid var(--ion-border-color, #e0e0e0)",
									}}
								>
									<input
										type="checkbox"
										checked={lang.selected}
										ref={(el) => {
											if (el) el.indeterminate = lang.indeterminate;
										}}
										onChange={() => toggleLanguage(langIdx)}
										style={{
											width: 20,
											height: 20,
											marginRight: 12,
											flexShrink: 0,
										}}
									/>
									<button
										type="button"
										style={{
											fontWeight: "bold",
											flex: 1,
											fontSize: "1rem",
											background: "none",
											border: "none",
											textAlign: "left",
											padding: 0,
											cursor: "pointer",
										}}
										onClick={() => expandLanguage(langIdx)}
									>
										{lang.entry.display}
									</button>
									{lang.loading ? (
										<IonSpinner style={{ width: 20, height: 20 }} />
									) : (
										<button
											type="button"
											onClick={() => expandLanguage(langIdx)}
											style={{
												background: "none",
												border: "none",
												cursor: "pointer",
												padding: "0 8px",
												fontSize: "0.8rem",
											}}
										>
											{lang.expanded ? "▲" : "▼"}
										</button>
									)}
								</div>

								{/* Book rows */}
								{lang.expanded &&
									lang.books.map((book, bookIdx) => (
										<div key={book.book}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													padding: "10px 16px 10px 40px",
													borderBottom:
														"1px solid var(--ion-border-color, #e0e0e0)",
												}}
											>
												<input
													type="checkbox"
													checked={book.selected}
													ref={(el) => {
														if (el) el.indeterminate = book.indeterminate;
													}}
													onChange={() => toggleBook(langIdx, bookIdx)}
													style={{
														width: 18,
														height: 18,
														marginRight: 12,
														flexShrink: 0,
													}}
												/>
												<button
													type="button"
													style={{
														flex: 1,
														background: "none",
														border: "none",
														textAlign: "left",
														padding: 0,
														cursor: "pointer",
													}}
													onClick={() =>
														setBookExpanded(langIdx, bookIdx, !book.expanded)
													}
												>
													{book.book}
												</button>
												<button
													type="button"
													onClick={() =>
														setBookExpanded(langIdx, bookIdx, !book.expanded)
													}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														padding: "0 8px",
														fontSize: "0.8rem",
													}}
												>
													{book.expanded ? "▲" : "▼"}
												</button>
											</div>

											{/* Chapter rows */}
											{book.expanded &&
												book.chapters.map((chap, chapIdx) => (
													<div
														key={chap.chapter}
														style={{
															display: "flex",
															alignItems: "center",
															padding: "8px 16px 8px 72px",
															borderBottom:
																"1px solid var(--ion-border-color, #e0e0e0)",
														}}
													>
														<input
															type="checkbox"
															checked={chap.selected}
															onChange={() =>
																toggleChapter(langIdx, bookIdx, chapIdx)
															}
															style={{
																width: 16,
																height: 16,
																marginRight: 12,
																flexShrink: 0,
															}}
														/>
														<span>Chapter {chap.chapter}</span>
													</div>
												))}
										</div>
									))}
							</div>
						))}
					</div>
				)}
			</IonContent>

			<IonFooter>
				<IonToolbar>
					<IonButtons slot="start">
						<IonButton onClick={onClose} disabled={copying}>
							Cancel
						</IonButton>
					</IonButtons>
					<IonButtons slot="end">
						<IonButton
							color="primary"
							strong
							onClick={handleCopy}
							disabled={copying || selectedCount === 0}
						>
							Copy{selectedCount > 0 ? ` (${selectedCount})` : ""}
						</IonButton>
					</IonButtons>
				</IonToolbar>
			</IonFooter>
		</IonModal>
	);
}
