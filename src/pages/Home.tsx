import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import "./Home.css";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";

const Home: React.FC = () => {
  const {t, i18n} = useTranslation();
  const alphabetizedKeys = Object.keys(
    brightCovePlaylistConfig
  ).sort() as unknown as Array<keyof typeof brightCovePlaylistConfig>;

  return (
    <IonPage id="home-page">
      <IonHeader>
        <IonToolbar>
          <div className="flex content-center">
            <span className="inline-block w-24 relative">
              <a href="/">
                <img src="assets/WA-Logo.png" alt="WA logo" />
              </a>
            </span>
            <IonTitle>Sign Language Bible</IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div>
          <h1 className="w-full text-center text-3xl my-4">
            {t("pickSignBible")}
          </h1>
          <ul className="flex flex-col  gap-3">
            {alphabetizedKeys.map((key) => {
              const value = brightCovePlaylistConfig[key];
              return (
                <li
                  key={value.path}
                  className="flex items-center  w-full gap-3 mx-2"
                >
                  <img
                    className="block max-w-16"
                    src={`assets/flags/${value.flag}`}
                    alt=""
                  />
                  <div>
                    <Link
                      to={{pathname: value.path, state: {routeInfo: value}}}
                    >
                      <h2 className="text-2xl">{value.display}</h2>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {/* <h1>{t("slb")}</h1> */}
      </IonContent>
    </IonPage>
  );
};

export default Home;
