// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { RuleObject } from 'antd/lib/form';
import i18n from 'i18next';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RuleType } from 'rc-field-form/lib/interface';

import patterns from './validation-patterns';

export function validateUsername(_: RuleObject, value: string): Promise<void> {
    if (!value) {
        return Promise.resolve();
    }

    if (!patterns.validateUsernameLength.pattern.test(value)) {
        return Promise.reject(new Error(patterns.validateUsernameLength.message));
    }

    if (!patterns.validateUsernameCharacters.pattern.test(value)) {
        return Promise.reject(new Error(patterns.validateUsernameCharacters.message));
    }

    return Promise.resolve();
}

const validationRules = {
    firstName: [
        {
            required: true,
            get message(): string {
                return i18n.t('errors::Please specify a first name');
            },
            pattern: patterns.validateName.pattern,
        },
    ],

    lastName: [
        {
            required: true,
            get message(): string {
                return i18n.t('errors::Please specify a last name');
            },
            pattern: patterns.validateName.pattern,
        },
    ],

    email: [
        {
            type: 'email' as RuleType,
            get message(): string {
                return i18n.t('common::The input is not valid E-mail!');
            },
        },
        {
            required: true,
            get message(): string {
                return i18n.t('common::Please specify an email address');
            },
        },
    ],

    userName: [
        {
            required: true,
            get message(): string {
                return i18n.t('errors::Please specify a username');
            },
        },
        {
            validator: validateUsername,
        },
    ],
};

export default validationRules;
