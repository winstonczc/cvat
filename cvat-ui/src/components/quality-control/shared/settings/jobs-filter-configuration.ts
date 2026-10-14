// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import _ from 'lodash';
import i18n from 'i18next';
import { Config } from '@react-awesome-query-builder/antd';
import { getJobsFilterConfig as getJobPageFilterConfig } from 'components/jobs-page/jobs-filter-configuration';

// the configuration contains user-visible labels, so it must be
// evaluated on each render to react to language switching
export function getJobsFilterConfig(): Partial<Config> {
    const jobPageFilterConfig = getJobPageFilterConfig();
    return {
        fields: {
            ..._.pick(
                jobPageFilterConfig.fields, ['state', 'stage', 'assignee', 'updatedDate', 'id', 'task_name', 'task_id'],
            ),
            type: {
                label: i18n.t('quality::Job Type'),
                type: 'select',
                operators: ['select_equals'],
                valueSources: ['value'],
                fieldSettings: {
                    listValues: [
                        { value: 'annotation', title: i18n.t('quality::Annotation') },
                        { value: 'consensus_replica', title: i18n.t('quality::Consensus replica') },
                    ],
                },
            },
        },
    };
}

export const localStorageRecentCapacity = 10;
export const localStorageRecentKeyword = 'recentlyAppliedQualityJobsFilters';
