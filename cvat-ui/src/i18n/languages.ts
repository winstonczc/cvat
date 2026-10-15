// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Side-effect imports registering dayjs locales. `en` is built into dayjs.
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/de';
import 'dayjs/locale/es';

import type { Locale } from 'antd/lib/locale';
import enUS from 'antd/lib/locale/en_US';
import zhCN from 'antd/lib/locale/zh_CN';
import zhTW from 'antd/lib/locale/zh_TW';
import deDE from 'antd/lib/locale/de_DE';
import esES from 'antd/lib/locale/es_ES';

export type LanguageCode = 'en' | 'zh-Hans' | 'zh-Hant' | 'de' | 'es';

export interface SupportedLanguage {
    code: LanguageCode;
    /** Native name of the language, always displayed in that language */
    label: string;
    /** Corresponding antd `ConfigProvider` locale */
    antdLocale: Locale;
    /** Corresponding dayjs locale name */
    dayjsLocale: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    {
        code: 'en', label: 'English', antdLocale: enUS, dayjsLocale: 'en',
    },
    {
        code: 'zh-Hans', label: '简体中文', antdLocale: zhCN, dayjsLocale: 'zh-cn',
    },
    {
        code: 'zh-Hant', label: '繁體中文', antdLocale: zhTW, dayjsLocale: 'zh-tw',
    },
    {
        code: 'de', label: 'Deutsch', antdLocale: deDE, dayjsLocale: 'de',
    },
    {
        code: 'es', label: 'Español', antdLocale: esES, dayjsLocale: 'es',
    },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** localStorage key used to persist the user's language choice */
export const LANGUAGE_STORAGE_KEY = 'cvat-language';

export function getLanguageMeta(code?: string): SupportedLanguage {
    return SUPPORTED_LANGUAGES.find((language) => language.code === code) ??
        SUPPORTED_LANGUAGES.find((language) => language.code === DEFAULT_LANGUAGE) as SupportedLanguage;
}

/**
 * Maps a browser-detected language tag onto one of the supported language codes.
 * Browsers report e.g. `zh-CN`, `zh`, `zh-TW`, `de-DE`, `es-419` which do not
 * match our codes verbatim.
 */
export function normalizeDetectedLanguage(detected?: string): LanguageCode | undefined {
    if (!detected) return undefined;
    const tag = detected.toLowerCase().replace('_', '-');

    if (tag.startsWith('zh')) {
        // Traditional Chinese locales: Taiwan, Hong Kong, Macau
        if (/(^|-)tw\b|(^|-)hk\b|(^|-)mo\b|hant/.test(tag)) return 'zh-Hant';
        return 'zh-Hans';
    }
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
    return undefined;
}
