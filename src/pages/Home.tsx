import MessageListItem from "../components/MessageListItem";
import {useEffect, useState} from "react";
import {Message, getMessages} from "../data/messages";
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from "@ionic/react";
import "./Home.css";
import {useTranslation} from "react-i18next";
import {Route, Link} from "react-router-dom";
import brightCovePlaylistConfig from "../brightcove/playlist-mappers";

const Home: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const {t, i18n} = useTranslation();
  useIonViewWillEnter(() => {
    const msgs = getMessages();
    setMessages(msgs);
  });

  // const refresh = (e: CustomEvent) => {
  //   setTimeout(() => {
  //     e.detail.complete();
  //   }, 3000);
  // };
  // onIonRefresh={refresh}?
  return (
    <IonPage id="home-page">
      <IonHeader>
        <IonToolbar>
          <div className="flex content-center">
            <span className="inline-block w-24 relative">
              <a href="/">
                <img src="/assets/WA-Logo.png" alt="WA logo" />
              </a>
            </span>
            <IonTitle>Sign Language Bible</IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div>
          <h1>Pick a sign bible</h1>
          <ul>
            {Object.values(brightCovePlaylistConfig).map((value) => (
              <li key={value.path}>
                <Link to={{pathname: value.path, state: {routeInfo: value}}}>
                  {" "}
                  {value.display}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* <h1>{t("slb")}</h1> */}
      </IonContent>
    </IonPage>
  );
};

export default Home;
