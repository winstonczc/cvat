// Copyright (C) 2022 Intel Corporation
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
            dimension: {
                label: i18n.t('tasks::Dimension'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: '1d', title: '1D' },
                        { value: '2d', title: '2D' },
                        { value: '3d', title: '3D' },
                    ],
                },
            },
            status: {
                label: i18n.t('tasks::Status'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals', 'select_any_in', 'select_not_any_in'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('tasks::Annotation') },
                        { value: 'validation', title: i18n.t('tasks::Validation') },
                        { value: 'completed', title: i18n.t('tasks::Completed') },
                    ],
                },
            },
            mode: {
                label: i18n.t('tasks::Data'),
                type: 'select',
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'interpolation', title: i18n.t('tasks::Video') },
                        { value: 'annotation', title: i18n.t('tasks::Images') },
                    ],
                },
            },
            subset: {
                label: i18n.t('tasks::Subset'),
                type: 'text',
                valueSources: ['value'],
                operators: ['equal'],
            },
            assignee: {
                label: i18n.t('tasks::Assignee'),
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
                label: i18n.t('tasks::Owner'),
                type: 'select',
                valueSources: ['value'],
                operators: ['select_equals'],
                fieldSettings: {
                    useAsyncSearch: true,
                    forceAsyncSearch: true,
                    asyncFetch: asyncFetchUsers,
                },
            },
            created_date: {
                label: i18n.t('tasks::Created at'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            updated_date: {
                label: i18n.t('tasks::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            id: {
                label: 'ID',
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            project_id: {
                label: i18n.t('tasks::Project ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            name: {
                label: i18n.t('tasks::Name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            project_name: {
                label: i18n.t('tasks::Project name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedTasksFilters';
export function getPredefinedFilterValues(): Record<string, string> {
    return {
        [i18n.t('tasks::Assigned to me')]: '{"and":[{"==":[{"var":"assignee"},"<username>"]}]}',
        [i18n.t('tasks::Owned by me')]: '{"and":[{"==":[{"var":"owner"},"<username>"]}]}',
        [i18n.t('tasks::Not completed')]: '{"!":{"and":[{"==":[{"var":"status"},"completed"]}]}}',
    };
}
