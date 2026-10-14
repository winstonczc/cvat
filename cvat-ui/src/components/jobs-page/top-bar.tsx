// Copyright (C) 2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';

import { JobsQuery } from 'reducers';
import dimensions from 'utils/dimensions';
import {
    SortingComponent,
    ResourceFilterHOC,
    defaultVisibility,
    ResourceSelectionInfo,
} from 'components/resource-sorting-filtering';
import JobsCSVExportButton from './jobs-csv-export-button';
import {
    localStorageRecentKeyword, localStorageRecentCapacity, getPredefinedFilterValues, getJobsFilterConfig,
} from './jobs-filter-configuration';

interface Props {
    query: JobsQuery;
    onApplyFilter(filter: string | null): void;
    onApplySorting(sorting: string | null): void;
    onApplySearch(search: string | null): void;
    selectedCount: number;
    onSelectAll: () => void;
}

function TopBarComponent(props: Readonly<Props>): JSX.Element {
    const {
        query, onApplyFilter, onApplySorting, onApplySearch, selectedCount, onSelectAll,
    } = props;
    const [visibility, setVisibility] = useState(defaultVisibility);
    const { t, i18n } = useTranslation('jobs');

    const FilteringComponent = useMemo(() => ResourceFilterHOC(
        getJobsFilterConfig(), localStorageRecentKeyword, localStorageRecentCapacity, getPredefinedFilterValues(),
    ), [i18n.language]);

    return (
        <Row className='cvat-jobs-page-top-bar cvat-resource-top-bar-wrapper' justify='center' align='middle'>
            <Col {...dimensions}>
                <div>
                    <div>
                        <Input.Search
                            enterButton
                            onSearch={(phrase: string) => {
                                onApplySearch(phrase);
                            }}
                            defaultValue={query.search ?? ''}
                            className='cvat-jobs-page-search-bar'
                            placeholder={t('Search ...')}
                        />
                        <ResourceSelectionInfo selectedCount={selectedCount} onSelectAll={onSelectAll} />
                    </div>
                    <div>
                        <SortingComponent
                            visible={visibility.sorting}
                            onVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, sorting: visible })
                            )}
                            defaultFields={query.sort?.split(',') || ['-ID']}
                            sortingFields={['ID', 'Assignee', 'Updated date', 'Stage', 'State', 'Task ID', 'Project ID', 'Task name', 'Project name']}
                            onApplySorting={onApplySorting}
                        />
                        <FilteringComponent
                            value={query.filter}
                            predefinedVisible={visibility.predefined}
                            builderVisible={visibility.builder}
                            recentVisible={visibility.recent}
                            onPredefinedVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, predefined: visible })
                            )}
                            onBuilderVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visible })
                            )}
                            onRecentVisibleChange={(visible: boolean) => (
                                setVisibility({ ...defaultVisibility, builder: visibility.builder, recent: visible })
                            )}
                            onApplyFilter={onApplyFilter}
                        />
                        <JobsCSVExportButton query={query} />
                    </div>
                </div>
            </Col>
        </Row>
    );
}

export default React.memo(TopBarComponent);
