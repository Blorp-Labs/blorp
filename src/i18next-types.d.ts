import "i18next";
import en from "../public/locales/en.json";

declare module "i18next" {
  interface CustomTypeOptions {
    // Your default namespace name (leave as 'translation' if you didn't change it)
    defaultNS: "translation";
    // Shape of the resources for key-intellisense & argument checking
    resources: {
      translation: typeof en;
    };
    // (optional) make t() never return null
    returnNull: false;
  }
}
