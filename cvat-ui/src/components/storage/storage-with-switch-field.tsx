// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Form from 'antd/lib/form';
import Text from 'antd/lib/typography/Text';
import Space from 'antd/lib/space';
import Switch from 'antd/lib/switch';
import Tooltip from 'antd/lib/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import CVATTooltip from 'components/common/cvat-tooltip';
import { StorageData, StorageLocation } from 'cvat-core-wrapper';
import StorageField from './storage-field';

export interface Props {
    instanceId: number | null;
    storageName: string;
    storageLabel: string;
    switchName: string;
    locationValue: StorageLocation;
    switchDescription?: string;
    switchHelpMessage?: string;
    storageDescription?: string;
    useDefaultStorage?: boolean | null;
    onChangeLocationValue?: (value: StorageLocation) => void;
    onChangeStorage?: (values: StorageData) => void;
    onChangeUseDefaultStorage?: (value: boolean) => void;
    disableSwitch?: boolean;
}

export default function StorageWithSwitchField(props: Readonly<Props>): JSX.Element {
    const {
        instanceId,
        storageName,
        storageLabel,
        switchName,
        switchDescription,
        switchHelpMessage,
        storageDescription,
        useDefaultStorage,
        locationValue,
        onChangeUseDefaultStorage,
        onChangeStorage,
        onChangeLocationValue,
        disableSwitch,
    } = props;
    const { t } = useTranslation('common');

    return (
        <>
            {!!instanceId && !disableSwitch && (
                <Space>
                    <Form.Item
                        name={switchName}
                        valuePropName='checked'
                        className='cvat-settings-switch cvat-switch-use-default-storage'
                    >
                        <Switch
                            onChange={(value: boolean) => {
                                if (onChangeUseDefaultStorage) {
                                    onChangeUseDefaultStorage(value);
                                }
                            }}
                        />
                    </Form.Item>
                    <Text strong>{switchDescription ? t(switchDescription) : null}</Text>
                    {switchHelpMessage ? (
                        <Tooltip title={t(switchHelpMessage)}>
                            <QuestionCircleOutlined />
                        </Tooltip>
                    ) : null}
                </Space>
            )}
            {(!instanceId || !useDefaultStorage) && (
                <Form.Item
                    label={(
                        <Space>
                            {t(storageLabel)}
                            <CVATTooltip title={storageDescription ? t(storageDescription) : null}>
                                <QuestionCircleOutlined style={{ opacity: 0.5 }} />
                            </CVATTooltip>
                        </Space>
                    )}
                >
                    <StorageField
                        locationName={[storageName, 'location']}
                        selectCloudStorageName={[storageName, 'cloudStorageId']}
                        locationValue={locationValue}
                        onChangeStorage={onChangeStorage}
                        onChangeLocationValue={onChangeLocationValue}
                    />
                </Form.Item>
            )}
        </>
    );
}
