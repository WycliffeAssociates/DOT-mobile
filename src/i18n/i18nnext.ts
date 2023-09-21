import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  fr: {
    translation: {
      slb: "Sign Language Bible fr",
      bibleSelection: "Sélection de la Bible",
      chooseBook: "Choisissez un livre de la Bible à regarder ici.",
      saveThisVideo: "Enregistrer cette vidéo",
      saveThisBook: "Enregistrer ce livre hors ligne",
      deleteThisVideo: "Supprimer cette vidéo",
      deleteThisBook: "Supprimer tous les chapitres enregistrés dans ce livre.",
      videoAlreadySaved: "Déjà enregistré hors ligne",
      bookAlreadySaved: "Livre sauvegardé hors ligne",
      saveEntirePlaylist: "Enregistrer cette liste de lecture hors ligne",
      downloadSize: "{{size}} taille du téléchargement",
      unknownDownloadSize: "Taille de téléchargement inconnue",
      loading: "Chargement",
      error: "Erreur",
      errorOccurred:
        "Une erreur s'est produite. Essayez de redémarrer l'application et, si le problème persiste, contactez le développeur.",
      preferredVideoSpeed: "Vitesse vidéo préférée",
      downloadOptions: "Options de téléchargement",
      deleteOptions: "Options de suppression des vidéos téléchargées",
      partiallySavedAmount: "{{percent}} déjà sauvegardé",
      downloadInProgress: "Téléchargement en cours",
      downloadSelected: "Téléchargement sélectionné",
      deleteSelected: "Supprimer la sélection",
      deleteInProgress: "Suppression de la sélection",
    },
  },
  en: {
    translation: {
      slb: "Sign Language Bible",
      bibleSelection: "Bible Selection",
      chooseBook: "Choose a book of the Bible to watch here",
      saveThisVideo: "Save this video",
      saveThisBook: "Save this book",
      deleteThisVideo: "Delete this video",
      deleteThisBook: "Delete all chapters saved in this book",
      videoAlreadySaved: "Already saved offline",
      bookAlreadySaved: "Book already saved offline",
      saveEntirePlaylist: "Save entire playlist",
      downloadSize: "{{size}} download size",
      unknownDownloadSize: "Unknown download size",
      loading: "Loading",
      error: "Error",
      errorOccurred:
        "An error has occurred. Try restarting the app, and if it persists, contacting the developer.",
      preferredVideoSpeed: "Preferred video speed",
      downloadOptions: "Download options",
      deleteOptions: "Deleted downloaded videos options",
      partiallySavedAmount: "{{percent}} saved already",
      downloadInProgress: "Download in progress",
      downloadSelected: "Download selected",
      deleteSelected: "Remove selected",
      deleteInProgress: "Removing selected",
    },
  },
};
const detectorOptions = {
  // order and from where user language should be detected
  order: [
    "navigator",
    "querystring",
    "cookie",
    "localStorage",
    "sessionStorage",
    "htmlTag",
    "path",
    "subdomain",
  ],

  // cache user language on
  caches: ["localStorage", "cookie"],
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: "en",
    debug: true,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: detectorOptions,
  });

export default i18n;
