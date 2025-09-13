import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

const base = import.meta.env.BASE_URL || "";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: import.meta.env.DEV, // only log in dev
    backend: {
      // just one JSON file per lang
      loadPath: `${base}locales/{{lng}}.json`,
    },
    interpolation: {
      escapeValue: false, // react already handles escaping
    },
  });

export default i18n;
