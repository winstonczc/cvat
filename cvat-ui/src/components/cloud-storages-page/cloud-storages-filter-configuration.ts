// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export function getFilterConfig(): Partial<Config> {
    return {
        fields: {
            id: {
                label: i18n.t('cloud-storages::ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            provider_type: {
                label: i18n.t('cloud-storages::Provider type'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'AWS_S3_BUCKET', title: 'Amazon S3' },
                        { value: 'AZURE_CONTAINER', title: 'Azure Blob Storage' },
                        { value: 'GOOGLE_CLOUD_STORAGE', title: 'Google Cloud Storage' },
                    ],
                },
            },
            credentials_type: {
                label: i18n.t('cloud-storages::Credentials type'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'KEY_SECRET_KEY_PAIR', title: i18n.t('cloud-storages::Key & secret key') },
                        { value: 'ACCOUNT_NAME_TOKEN_PAIR', title: i18n.t('cloud-storages::Account name & token') },
                        { value: 'ANONYMOUS_ACCESS', title: i18n.t('cloud-storages::Anonymous access') },
                        { value: 'KEY_FILE_PATH', title: i18n.t('cloud-storages::Key file') },
                    ],
                },
            },
            resource: {
                label: i18n.t('cloud-storages::Resource name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            name: {
                label: i18n.t('cloud-storages::Name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            description: {
                label: i18n.t('cloud-storages::Description'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            owner: {
                label: i18n.t('cloud-storages::Owner'),
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
                label: i18n.t('cloud-storages::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedCloudStoragesFilters';

export function getPredefinedFilterValues(): Record<string, string> {
    return {
        [i18n.t('cloud-storages::Owned by me')]: '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
        [i18n.t('cloud-storages::Amazon S3 storages')]: '{"and":[{"==":[{"var":"provider_type"},"AWS_S3_BUCKET"]}]}',
        [i18n.t('cloud-storages::Azure Blob storages')]: '{"and":[{"==":[{"var":"provider_type"},"AZURE_CONTAINER"]}]}',
        [i18n.t('cloud-storages::Google Cloud storages')]: '{"and":[{"==":[{"var":"provider_type"},"GOOGLE_CLOUD_STORAGE"]}]}',
    };
}
