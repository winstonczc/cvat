// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import resources, { NAMESPACES } from './resources';
import {
    DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, normalizeDetectedLanguage,
} from './languages';

export { NAMESPACES };
export type { Namespace } from './resources';

/**
 * English is the source language: the key is the English string itself
 * (see `keySeparator: false` / `nsSeparator: '::'`). Translations for other
 * languages are added under `src/locales/<language>/<namespace>.json`.
 *
 * `resources.ts` is GENERATED from the locale directory layout by
 * `scripts/gen-i18n-resources.py` — rerun it after adding a namespace.
 */

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
        defaultNS: 'common',
        fallbackNS: 'common',
        ns: [...NAMESPACES],

        // The English source string is used as the key, so separators must
        // not be interpreted as key/namespace paths.
        keySeparator: false,
        nsSeparator: '::',

        interpolation: {
            // React already escapes values
            escapeValue: false,
        },

        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            caches: ['localStorage'],
            // Browsers report `zh-CN`, `zh-TW`, `de-DE`, ... map them onto our codes
            convertDetectedLanguage: (detected: string) => normalizeDetectedLanguage(detected) ?? DEFAULT_LANGUAGE,
        },

        returnEmptyString: false,

        react: {
            // Do not require a Suspense boundary around translated content
            useSuspense: false,
        },
    });

export default i18n;
