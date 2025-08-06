import { IonContent, IonHeader, IonPage, IonToolbar } from "@ionic/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";
import { DotLogo } from "../components/Icons";
import "./Home.css";

const Home: React.FC = () => {
	const { t } = useTranslation();
	const alphabetizedByPlaylistDisplayName = Object.entries(
		brightCovePlaylistConfig,
	).sort((a, b) =>
		a[1].playlistDisplayName.localeCompare(b[1].playlistDisplayName),
	);

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
					<ul
						data-testid="playlistsAvailable"
						className="flex flex-col  gap-3 pb-12"
					>
						{alphabetizedByPlaylistDisplayName.map(([_key, value]) => {
							return (
								<li key={value.path} className=" border-b-[#E9E9E9] border-b">
									<Link
										to={{ pathname: value.path, state: { routeInfo: value } }}
										className=" py-4 block  flex items-center  w-full gap-3"
									>
										<img
											className="block w-8"
											src={`assets/flags/${value.flag}`}
											alt=""
										/>
										{value.display}
									</Link>
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
