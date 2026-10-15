// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { isEqual } from 'lodash';
import { CombinedState } from 'reducers';

import Form from 'antd/lib/form';
import Card from 'antd/lib/card';
import { Col, Row } from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';

import { updateUserAsync } from 'actions/auth-actions';
import validationRules from 'utils/validation-rules';

interface ProfileFormValues {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    primaryRole?: string;
    customRole?: string;
}

const getRoleOptions = (): { value: string; label: string }[] => [
    { value: 'ml_engineer', label: i18n.t('profile::Machine learning engineer') },
    { value: 'data_scientist', label: i18n.t('profile::Data scientist') },
    { value: 'annotation_specialist', label: i18n.t('profile::Annotation specialist') },
    { value: 'project_manager', label: i18n.t('profile::Project manager') },
    { value: 'founder_executive', label: i18n.t('profile::Founder or executive') },
    { value: 'researcher', label: i18n.t('profile::Researcher') },
    { value: 'student', label: i18n.t('profile::Student') },
    { value: 'educator', label: i18n.t('profile::Educator') },
    { value: 'other', label: i18n.t('profile::Other') },
];
const predefinedRoles = new Set(getRoleOptions().map(({ value }) => value).filter((value) => value !== 'other'));

function UserInfoCard(): JSX.Element {
    const { t } = useTranslation('profile');
    const user = useSelector((state: CombinedState) => state.auth.user);
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    let initialPrimaryRole: string | undefined;
    if (user?.primaryRole) {
        initialPrimaryRole = predefinedRoles.has(user.primaryRole) ? user.primaryRole : 'other';
    }
    const [primaryRole, setPrimaryRole] = useState<string | undefined>(initialPrimaryRole);

    const initialValues: ProfileFormValues = {
        username: user?.username,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        primaryRole: initialPrimaryRole,
        customRole: initialPrimaryRole === 'other' ? user?.primaryRole || undefined : undefined,
    };

    useEffect(() => {
        form.setFieldsValue(initialValues);
        setPrimaryRole(initialPrimaryRole);
    }, [user, form]);

    const onFinish = async (values: ProfileFormValues): Promise<void> => {
        const currentEditableValues = {
            username: values.username,
            firstName: values.firstName,
            lastName: values.lastName,
            primaryRole: values.primaryRole === 'other' ? values.customRole?.trim() : values.primaryRole,
        };
        const initialEditableValues = {
            username: initialValues.username,
            firstName: initialValues.firstName,
            lastName: initialValues.lastName,
            primaryRole: user?.primaryRole || undefined,
        };
        if (user && !isEqual(currentEditableValues, initialEditableValues)) {
            const updatedFields: Parameters<typeof user.save>[0] = {};
            if (values.username !== initialValues.username) {
                updatedFields.username = values.username;
            }
            if (values.firstName !== initialValues.firstName) {
                updatedFields.firstName = values.firstName;
            }
            if (values.lastName !== initialValues.lastName) {
                updatedFields.lastName = values.lastName;
            }
            if (currentEditableValues.primaryRole !== initialEditableValues.primaryRole) {
                updatedFields.primaryRole = currentEditableValues.primaryRole;
            }

            await dispatch(updateUserAsync(user, updatedFields));
        }
    };

    return (
        <Card title={t('Personal Information')} className='cvat-profile-info-card'>
            <Form
                form={form}
                layout='vertical'
                onFinish={onFinish}
                initialValues={initialValues}
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            label={t('First Name')}
                            name='firstName'
                            rules={validationRules.firstName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            label={t('Last Name')}
                            name='lastName'
                            rules={validationRules.lastName}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item
                    label={t('Primary role')}
                    name='primaryRole'
                >
                    <Select options={getRoleOptions()} onChange={setPrimaryRole} />
                </Form.Item>
                {primaryRole === 'other' && (
                    <Form.Item
                        label={t('Please specify your role')}
                        name='customRole'
                        rules={[
                            { required: true, whitespace: true, message: t('Enter your role') },
                            { max: 255, message: t('The role must not exceed 255 characters') },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                )}
                <Form.Item
                    label={t('common::Email')}
                    name='email'
                    rules={validationRules.email}
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('common::Username')}
                    name='username'
                    rules={validationRules.userName}
                >
                    <Input />
                </Form.Item>

                <Form.Item>
                    <Row justify='end'>
                        <Button
                            type='primary'
                            htmlType='submit'
                        >
                            {t('Save changes')}
                        </Button>
                    </Row>
                </Form.Item>
            </Form>
        </Card>
    );
}

export default React.memo(UserInfoCard);
