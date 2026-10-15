// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import { Config } from '@react-awesome-query-builder/antd';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';
import { enumLabel } from 'i18n/enum-labels';

// the configuration contains user-visible labels, so it must be
// evaluated on each render to react to language switching
export function getFilterConfiguration(): Partial<Config> {
    return {
        fields: {
            state: {
                label: i18n.t('tasks::State'),
                type: 'select',
                operators: ['select_any_in', 'select_equals'], // ['select_equals', 'select_not_equals', 'select_any_in', 'select_not_any_in']
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'new', title: enumLabel('new') },
                        { value: 'in progress', title: enumLabel('in progress') },
                        { value: 'rejected', title: enumLabel('rejected') },
                        { value: 'completed', title: enumLabel('completed') },
                    ],
                },
            },
            stage: {
                label: i18n.t('tasks::Stage'),
                type: 'select',
                operators: ['select_any_in', 'select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: enumLabel('annotation') },
                        { value: 'validation', title: enumLabel('validation') },
                        { value: 'acceptance', title: enumLabel('acceptance') },
                    ],
                },
            },
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
            updatedDate: {
                label: i18n.t('tasks::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            type: {
                label: i18n.t('tasks::Type'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('tasks::Annotation') },
                        { value: 'ground_truth', title: i18n.t('common::Ground truth') },
                        { value: 'consensus_replica', title: i18n.t('tasks::Consensus replica') },
                    ],
                },
            },
            id: {
                label: 'ID',
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            parent_job_id: {
                label: i18n.t('tasks::Parent ID'),
                type: 'number',
                operators: ['is_empty', 'is_not_empty', 'equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedJobsFilters';
export function getPredefinedFilterValues(): Record<string, string> {
    return {
        [i18n.t('tasks::Assigned to me')]: '{"and":[{"==":[{"var":"assignee"},"<username>"]}]}',
        [i18n.t('tasks::Not completed')]: '{"!":{"or":[{"==":[{"var":"state"},"completed"]},{"==":[{"var":"stage"},"acceptance"]}]}}',
        [i18n.t('tasks::Not a replica')]: '{"and":[{"!":{"var":"parent_job_id"}}]}',
    };
}
