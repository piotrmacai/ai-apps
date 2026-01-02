
// Define the shape of the translation files
interface TranslationFile {
  [key: string]: string;
}

const translations: { [key: string]: TranslationFile } = {};
let currentLanguage = 'en';

export const initI18n = async (): Promise<void> => {
  const browserLang = navigator.language.split('-')[0];
  const langToLoad = ['en', 'ko'].includes(browserLang) ? browserLang : 'en';

  try {
    const [enResponse, koResponse] = await Promise.all([
        fetch('./locales/en.json'),
        fetch('./locales/ko.json')
    ]);

    if (!enResponse.ok || !koResponse.ok) {
        throw new Error('Failed to fetch translation files');
    }
    
    translations['en'] = await enResponse.json();
    translations['ko'] = await koResponse.json();
    
    currentLanguage = langToLoad;
  } catch (error) {
    console.error("Failed to load translation files, falling back to English.", error);
    // As a last resort, hardcode English so the app doesn't completely crash on fetch error
    translations['en'] = {
        "appName": "AI Product Studio",
        "home": "Home",
        "newAlbum": "New Photoshoot",
        "myAlbums": "My Photoshoots",
        "inspiration": "Inspiration",
        "startProject": "Start a new photoshoot or select a project to continue.",
        "albumTitle": "Photoshoot",
        "galleryTitle": "Gallery",
        "chatPlaceholder": "Describe the scene for your product...",
        "remixingInProgress": "Generating...",
        "remixedCount": "Generated {{count}} images",
        "selectImage": "View Image",
        "editImage": "Edit",
        "addToChat": "Use in new prompt",
        "close": "Close",
        "downloadImage": "Download",
    };
    currentLanguage = 'en';
  }
};

export const getCurrentLanguage = (): string => {
  return currentLanguage;
};

export const t = (
  key: string,
  options?: { [key: string]: string | number }
): string => {
  const langTranslations = translations[currentLanguage];
  const fallbackTranslations = translations['en'];

  if (!langTranslations && !fallbackTranslations) {
    // This case should not be reached if initI18n is awaited correctly.
    return key;
  }

  let translation = (langTranslations && langTranslations[key]) || (fallbackTranslations && fallbackTranslations[key]) || key;
  
  if (options) {
    Object.entries(options).forEach(([optionKey, optionValue]) => {
      translation = translation.replace(`{{${optionKey}}}`, String(optionValue));
    });
  }

  return translation;
};
