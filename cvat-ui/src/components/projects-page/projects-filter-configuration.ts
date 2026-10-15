// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import i18n from 'i18next';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export function getFilterConfig(): Partial<Config> {
    return {
        fields: {
            id: {
                label: i18n.t('projects::ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            name: {
                label: i18n.t('projects::Name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            assignee: {
                label: i18n.t('projects::Assignee'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals'],
                fieldSettings: {
                    useAsyncSearch: true,
                    forceAsyncSearch: true,
                    asyncFetch: asyncFetchUsers,
                },
            },
            owner: {
                label: i18n.t('projects::Owner'),
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
                label: i18n.t('projects::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            status: {
                label: i18n.t('projects::Status'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals', 'select_any_in', 'select_not_any_in'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('projects::Annotation') },
                        { value: 'validation', title: i18n.t('projects::Validation') },
                        { value: 'completed', title: i18n.t('projects::Completed') },
                    ],
                },
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedProjectsFilters';
export function getPredefinedFilterValues(): Record<string, string> {
    return {
        [i18n.t('projects::Assigned to me')]: '{"and":[{"==":[{"var":"assignee"},"<username>"]}]}',
        [i18n.t('projects::Owned by me')]: '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
        [i18n.t('projects::Not completed')]: '{"!":{"and":[{"==":[{"var":"status"},"completed"]}]}}',
    };
}
