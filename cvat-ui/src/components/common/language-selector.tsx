// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './language-selector.scss';
import React from 'react';
import { MenuProps } from 'antd/lib/menu';
import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import { GlobalOutlined } from '@ant-design/icons';

import { LanguageCode, SUPPORTED_LANGUAGES, getLanguageMeta } from 'i18n/languages';
import { useLanguage } from 'i18n/use-language';

/**
 * Language switcher shown in the top-right corner of every page.
 */
export default function LanguageSelector(): JSX.Element {
    const { language, setLanguage } = useLanguage();
    const current = getLanguageMeta(language);

    const items: MenuProps['items'] = SUPPORTED_LANGUAGES.map((supported) => ({
        key: supported.code,
        label: supported.label,
    }));

    return (
        <Dropdown
            trigger={['click']}
            placement='bottomRight'
            menu={{
                items,
                selectable: true,
                selectedKeys: [current.code],
                onClick: (info) => setLanguage(info.key as LanguageCode),
            }}
            className='cvat-language-selector'
        >
            <Button type='link' icon={<GlobalOutlined />} className='cvat-language-selector-button'>
                {current.label}
            </Button>
        </Dropdown>
    );
}
