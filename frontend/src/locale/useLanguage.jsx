import languages from '@/locale/translation/translation';

const DEFAULT_LANG = 'en_us';

const normalizeKey = (key) =>
  String(key)
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const toTitleCaseLabel = (key) => {
  const remove_underscore_fromKey = String(key).replace(/_/g, ' ').split(' ');

  return remove_underscore_fromKey
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.substring(1))
    .join(' ');
};

const getLabel = (key) => {
  try {
    const lowerCaseKey = normalizeKey(key);
    const lang = languages[DEFAULT_LANG] || {};

    if (lang[lowerCaseKey] !== undefined && lang[lowerCaseKey] !== null) {
      return lang[lowerCaseKey];
    }

    return toTitleCaseLabel(key);
  } catch {
    return 'No translate';
  }
};

const useLanguage = () => {
  const translate = (value) => getLabel(value);

  return translate;
};

export default useLanguage;
