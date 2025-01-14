type entry = {
	playlist: string;
	path: string;
	display: string;
	flag: string;
};
type configType = Record<string, entry>;
// flags: https://github.com/hampusborgos/country-flags
const config: configType = {
	benin: {
		playlist: "benin-new-testament",
		path: "benin",
		display: "Benin",
		flag: "bj.png",
	},
	ghana: {
		playlist: "ghana-new-testament",
		path: "ghana",
		display: "Ghana",
		flag: "gh.png",
	},
	cote: {
		playlist: "cote-d'ivoire-new-testament",
		path: "cotedivoire",
		display: "Côte d'Ivoire",
		flag: "ci.png",
	},
	togo: {
		playlist: "togo-new-testament",
		path: "togo",
		display: "Togo",
		flag: "tg.png",
	},
	malawi: {
		playlist: "malawi-new-testament",
		path: "malawi",
		display: "Malawi",
		flag: "mw.png",
	},
	tanzania: {
		playlist: "tanzania-new-testament",
		path: "tanzania",
		display: "Tanzania",
		flag: "tz.png",
	},
	cameroon: {
		playlist: "cameroon-new-testament",
		path: "cameroon",
		display: "Cameroon",
		flag: "cm.png",
	},
	congodrc: {
		playlist: "congo-french-nt",
		path: "congodrc",
		display: "Republic of Congo (French)",
		flag: "cg.svg",
	},
	marathi: {
		playlist: "marathi-nt",
		path: "marathi",
		display: "Marathi",
		flag: "in.svg",
	},
} as const;
export default config;
