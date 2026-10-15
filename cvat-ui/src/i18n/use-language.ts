// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES } from './languages';

interface UseLanguageResult {
    language: LanguageCode;
    setLanguage: (code: LanguageCode) => void;
}

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((language) => language.code);

export function useLanguage(): UseLanguageResult {
    const { i18n } = useTranslation();

    const resolved = i18n.resolvedLanguage ?? i18n.language;
    const language = (SUPPORTED_CODES as string[]).includes(resolved) ?
        resolved as LanguageCode : DEFAULT_LANGUAGE;

    const setLanguage = useCallback((code: LanguageCode): void => {
        i18n.changeLanguage(code);
    }, [i18n]);

    return { language, setLanguage };
}

export default useLanguage;
