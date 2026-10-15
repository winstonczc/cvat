// Copyright (C) 2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Config } from '@react-awesome-query-builder/antd';
import i18n from 'i18next';
import asyncFetchUsers from 'components/resource-sorting-filtering/request-users';

export function getJobsFilterConfig(): Partial<Config> {
    return {
        fields: {
            state: {
                label: i18n.t('jobs::State'),
                type: 'select',
                operators: ['select_any_in', 'select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'new', title: i18n.t('jobs::new') },
                        { value: 'in progress', title: i18n.t('jobs::in progress') },
                        { value: 'rejected', title: i18n.t('jobs::rejected') },
                        { value: 'completed', title: i18n.t('jobs::completed') },
                    ],
                },
            },
            stage: {
                label: i18n.t('jobs::Stage'),
                type: 'select',
                operators: ['select_any_in', 'select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('jobs::annotation') },
                        { value: 'validation', title: i18n.t('jobs::validation') },
                        { value: 'acceptance', title: i18n.t('jobs::acceptance') },
                    ],
                },
            },
            dimension: {
                label: i18n.t('jobs::Dimension'),
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
                label: i18n.t('jobs::Assignee'),
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
                label: i18n.t('jobs::Last updated'),
                type: 'datetime',
                operators: ['between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
            },
            id: {
                label: i18n.t('jobs::ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            task_id: {
                label: i18n.t('jobs::Task ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            project_id: {
                label: i18n.t('jobs::Project ID'),
                type: 'number',
                operators: ['equal', 'between', 'greater', 'greater_or_equal', 'less', 'less_or_equal'],
                fieldSettings: { min: 0 },
                valueSources: ['value'],
            },
            task_name: {
                label: i18n.t('jobs::Task name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            project_name: {
                label: i18n.t('jobs::Project name'),
                type: 'text',
                valueSources: ['value'],
                operators: ['like'],
            },
            type: {
                label: i18n.t('jobs::Job Type'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('jobs::Annotation') },
                        { value: 'ground_truth', title: i18n.t('common::Ground truth') },
                        { value: 'consensus_replica', title: i18n.t('jobs::Consensus replica') },
                    ],
                },
            },
            parent_job_id: {
                label: i18n.t('jobs::Parent ID'),
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
        [i18n.t('jobs::Assigned to me')]: '{"and":[{"==":[{"var":"assignee"},"<username>"]}]}',
        [i18n.t('jobs::Not completed')]: '{"!":{"or":[{"==":[{"var":"state"},"completed"]},{"==":[{"var":"stage"},"acceptance"]}]}}',
    };
}
