import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";
import { DotLogo } from "../components/Icons";
import "./Home.css";

const Home: React.FC = () => {
	const { t } = useTranslation();
	const alphabetizedKeys = Object.keys(
		brightCovePlaylistConfig,
	).sort() as unknown as Array<keyof typeof brightCovePlaylistConfig>;

	return (
		<IonPage id="home-page">
			<IonHeader className="ion-no-border ">
				<IonToolbar style={{ "--min-height": "auto" }}>
					<div className="flex content-center py-2 border border-b border-b-[#e1e1e1]">
						<span className="w-44 block mx-auto">
							<a href="/">
								<DotLogo />
							</a>
						</span>
					</div>
				</IonToolbar>
			</IonHeader>
			<IonContent fullscreen>
				<div className="px-5 max-w-[1200px] mx-auto ">
					<h1 className="w-full text-center  mt-10 mb-5 font-bold  capitalize">
						{t("pickSignBible")}
					</h1>
					<ul data-testid="playlistsAvailable" className="flex flex-col  gap-3">
						{alphabetizedKeys.map((key) => {
							const value = brightCovePlaylistConfig[key];
							return (
								<li
									key={value.path}
									className="flex items-center  w-full gap-3 py-4 border-b-[#E9E9E9] border-b"
								>
									<img
										className="block max-w-8"
										src={`assets/flags/${value.flag}`}
										alt=""
									/>
									<div>
										<Link
											to={{ pathname: value.path, state: { routeInfo: value } }}
										>
											<h2 className="">{value.display}</h2>
										</Link>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			</IonContent>
		</IonPage>
	);
};

export default Home;
