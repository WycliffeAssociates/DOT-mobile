type Entry = {
	playlist: string;
	playlistDisplayName: string;
	path: string;
	display: string;
	flag: string;
};
const createConfig = <T extends Record<string, Entry>>(config: T) => config;

// flags: https://github.com/hampusborgos/country-flags
const config = createConfig({
	benin: {
		playlist: "benin-new-testament",
		playlistDisplayName: "Benin New Testament",
		path: "benin",
		display: "Benin",
		flag: "bj.png",
	},
	ghana: {
		playlist: "ghana-new-testament",
		playlistDisplayName: "Ghana New Testament",
		path: "ghana",
		display: "Ghana",
		flag: "gh.png",
	},
	cote: {
		playlist: "cote-d'ivoire-new-testament",
		playlistDisplayName: "Cote d'Ivoire New Testament",
		path: "cotedivoire",
		display: "Côte d'Ivoire",
		flag: "ci.png",
	},
	togo: {
		playlist: "togo-new-testament",
		playlistDisplayName: "Togo New Testament",
		path: "togo",
		display: "Togo",
		flag: "tg.png",
	},
	malawi: {
		playlist: "malawi-new-testament",
		playlistDisplayName: "Malawi New Testament",
		path: "malawi",
		display: "Malawi",
		flag: "mw.png",
	},
	tanzania: {
		playlist: "tanzania-new-testament",
		playlistDisplayName: "Tanzania New Testament",
		path: "tanzania",
		display: "Tanzania",
		flag: "tz.png",
	},
	cameroon: {
		playlist: "cameroon-new-testament",
		playlistDisplayName: "Cameroon New Testament",
		path: "cameroon",
		display: "Cameroon",
		flag: "cm.png",
	},
	congodrc: {
		playlist: "congo-french-nt",
		playlistDisplayName: "DRC French New Testament",
		path: "congodrc",
		display: "Democratic Republic of Congo (French)",
		flag: "cg.svg",
	},
	bukavu: {
		playlist: "ase-x-bukavusl",
		playlistDisplayName: "Democratic Republic of Congo (Bukavu)",
		path: "bukavu",
		display: "Democratic Republic of Congo (Bukavu)",
		flag: "cg.svg",
	},
	marathi: {
		playlist: "marathi-nt",
		playlistDisplayName: "Marathi New Testament",
		path: "marathi",
		display: "Marathi",
		flag: "in.svg",
	},
} as const);

export default config;
