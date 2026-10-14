// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

// the configuration contains user-visible labels, so it must be
// evaluated on each render to react to language switching
export function getFilterConfiguration(): Partial<Config> {
    return {
        fields: {
            user: {
                label: i18n.t('organizations::User'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals'],
                fieldSettings: {
                    useAsyncSearch: true,
                    forceAsyncSearch: true,
                    asyncFetch: asyncFetchUsers,
                },
            },
            role: {
                label: i18n.t('organizations::Role'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'worker', title: i18n.t('organizations::Worker') },
                        { value: 'supervisor', title: i18n.t('organizations::Supervisor') },
                        { value: 'maintainer', title: i18n.t('organizations::Maintainer') },
                        { value: 'owner', title: i18n.t('organizations::Owner') },
                    ],
                },
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedMembershipsFilters';
export function getPredefinedFilterValues(): Record<string, string> {
    return {
        [i18n.t('organizations::Workers')]: '{"and":[{"==":[{"var":"role"},"worker"]}]}',
        [i18n.t('organizations::Supervisors')]: '{"and":[{"==":[{"var":"role"},"supervisor"]}]}',
        [i18n.t('organizations::Maintainers')]: '{"and":[{"==":[{"var":"role"},"maintainer"]}]}',
    };
}
