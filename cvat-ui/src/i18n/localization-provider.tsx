// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfigProvider from 'antd/lib/config-provider';
import dayjs from 'dayjs';

import { getLanguageMeta } from './languages';

interface Props {
    children: React.ReactNode;
}

/**
 * Keeps every localization concern in sync with the active language:
 * - antd components (pagination, date pickers, empty states, ...)
 * - antd static APIs (`message`, `notification`, `Modal.confirm`, ...)
 * - dayjs date/number formatting
 * - the `<html lang>` attribute
 */
export default function LocalizationProvider(props: Props): JSX.Element {
    const { children } = props;
    const { i18n } = useTranslation();
    const meta = getLanguageMeta(i18n.resolvedLanguage);

    useEffect(() => {
        dayjs.locale(meta.dayjsLocale);
        document.documentElement.lang = meta.code;

        // antd static methods (`message.*`, `notification.*`, `Modal.confirm`, ...)
        // render outside of this component tree and therefore do not inherit the
        // `ConfigProvider` context. `holderRender` is the supported way to inject
        // the locale into them.
        ConfigProvider.config({
            holderRender: (nodes) => (
                <ConfigProvider locale={meta.antdLocale}>{nodes}</ConfigProvider>
            ),
        });
    }, [meta]);

    return (
        <ConfigProvider locale={meta.antdLocale}>
            {children}
        </ConfigProvider>
    );
}
