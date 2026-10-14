// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';

export async function toClipboard(text: string): Promise<boolean> {
    const fallback = (): boolean => {
        // eslint-disable-next-line
        window.prompt(i18n.t('errors::Browser Clipboard API not allowed, please copy manually'), text);
        return false;
    };

    if (window.isSecureContext) {
        try {
            await window.navigator.clipboard.writeText(text);
            return true;
        } catch {
            fallback();
            return false;
        }
    } else {
        return fallback();
    }
}
