// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Text from 'antd/lib/typography/Text';
import { Row, Col } from 'antd/lib/grid';
import Empty from 'antd/lib/empty';

import config from 'config';

export default function EmptyListComponent(): JSX.Element {
    const { t } = useTranslation('models');

    return (
        <div className='cvat-empty-models-list'>
            <Empty
                description={(
                    <div>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text strong>{t('No models deployed yet...')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>{t('To annotate your tasks automatically')}</Text>
                            </Col>
                        </Row>
                        <Row justify='center' align='middle'>
                            <Col>
                                <Text type='secondary'>
                                    <Trans
                                        ns='models'
                                        i18nKey='deploy a model with <1>nuclio</1>'
                                        components={[<a href={`${config.NUCLIO_GUIDE}`}>nuclio</a>]}
                                    />
                                </Text>
                            </Col>
                        </Row>
                    </div>
                )}
            />
        </div>
    );
}
