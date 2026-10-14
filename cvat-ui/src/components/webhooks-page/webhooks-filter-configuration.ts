// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import i18n from 'i18next';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export function getWebhooksFilterConfig(): Partial<Config> {
    return {
        fields: {
            description: {
                label: i18n.t('webhooks::Description'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            target_url: {
                label: i18n.t('webhooks::Target URL'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            owner: {
                label: i18n.t('webhooks::Owner'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals'],
                fieldSettings: {
                    useAsyncSearch: true,
                    forceAsyncSearch: true,
                    asyncFetch: asyncFetchUsers,
                },
            },
            updated_date: {
                label: i18n.t('webhooks::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            type: {
                label: i18n.t('webhooks::Type'),
                type: 'select',
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'organization', title: i18n.t('webhooks::Organization') },
                        { value: 'project', title: i18n.t('webhooks::Project') },
                    ],
                },
            },
            id: {
                label: i18n.t('webhooks::ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedWebhooksFilters';
export const predefinedFilterValues = {};
