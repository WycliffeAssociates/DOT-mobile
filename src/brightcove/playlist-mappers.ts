type Entry = {
	playlist: string;
	/** IETF language code from langnames.bibleineverylanguage.org */
	ietfCode: string;
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
		ietfCode: "ase-x-beninsl",
		playlistDisplayName: "Benin New Testament",
		path: "benin",
		display: "Benin",
		flag: "bj.png",
	},
	ghana: {
		playlist: "ghana-new-testament",
		ietfCode: "gse",
		playlistDisplayName: "Ghana New Testament",
		path: "ghana",
		display: "Ghana",
		flag: "gh.png",
	},
	cote: {
		playlist: "cote-d'ivoire-new-testament",
		ietfCode: "ase-x-cotedivosl",
		playlistDisplayName: "Cote d'Ivoire New Testament",
		path: "cotedivoire",
		display: "Côte d'Ivoire",
		flag: "ci.png",
	},
	togo: {
		playlist: "togo-new-testament",
		ietfCode: "ase-x-togolesesl",
		playlistDisplayName: "Togo New Testament",
		path: "togo",
		display: "Togo",
		flag: "tg.png",
	},
	malawi: {
		playlist: "malawi-new-testament",
		ietfCode: "lws",
		playlistDisplayName: "Malawi New Testament",
		path: "malawi",
		display: "Malawi",
		flag: "mw.png",
	},
	tanzania: {
		playlist: "tanzania-new-testament",
		ietfCode: "tza",
		playlistDisplayName: "Tanzania New Testament",
		path: "tanzania",
		display: "Tanzania",
		flag: "tz.png",
	},
	cameroon: {
		playlist: "cameroon-new-testament",
		ietfCode: "ase-x-camanglosl",
		playlistDisplayName: "Cameroon New Testament",
		path: "cameroon",
		display: "Cameroon",
		flag: "cm.png",
	},
	congodrc: {
		playlist: "congo-french-nt",
		ietfCode: "ase-x-drcfrnch",
		playlistDisplayName: "DRC French New Testament",
		path: "congodrc",
		display: "Democratic Republic of Congo (French)",
		flag: "drc.png",
	},
	drcswahili: {
		// slug is already the IETF code
		playlist: "ase-x-bukavusl",
		ietfCode: "ase-x-bukavusl",
		playlistDisplayName: "Democratic Republic of Congo (Swahili)",
		path: "drcswahili",
		display: "Democratic Republic of Congo (Swahili)",
		flag: "drc.png",
	},
	marathi: {
		playlist: "marathi-nt",
		ietfCode: "ins-x-marathsl",
		playlistDisplayName: "Marathi New Testament",
		path: "marathi",
		display: "Marathi",
		flag: "in.svg",
	},
	brazil: {
		playlist: "brazil-nt",
		ietfCode: "bzs",
		playlistDisplayName: "Brazilian New Testament",
		path: "brazil",
		display: "Brazil",
		flag: "br.svg",
	},
	paraguay: {
		playlist: "pys-nt",
		ietfCode: "pys",
		playlistDisplayName: "Paraguay New Testament",
		path: "paraguay",
		display: "Paraguay",
		flag: "paraguay.svg",
	},
	malayalam: {
		// slug is already the IETF code
		playlist: "ins-x-keralasl",
		ietfCode: "ins-x-keralasl",
		playlistDisplayName: "Malayalam New Testament",
		path: "malayalam",
		display: "Malayalam",
		flag: "in.svg",
	},
	mozambique: {
		playlist: "mozambique-new-testament",
		ietfCode: "mzy",
		playlistDisplayName: "Mozambican New Testament",
		path: "mozambique",
		display: "Mozambique",
		flag: "mz.svg",
	},
} as const);

export default config;
