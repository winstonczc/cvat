// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';

const validationPatterns = {
    validatePasswordLength: {
        pattern: /^(?=.{8,256}$)/,
        get message(): string {
            return i18n.t('errors::Password must be between 8 and 256 characters');
        },
    },

    passwordContainsNumericCharacters: {
        pattern: /(?=.*[0-9])/,
        get message(): string {
            return i18n.t('errors::Password must have at least 1 numeric characters');
        },
    },

    passwordContainsUpperCaseCharacter: {
        pattern: /(?=.*[A-Z])/,
        get message(): string {
            return i18n.t('errors::Password must have at least 1 uppercase alphabetical character');
        },
    },

    passwordContainsLowerCaseCharacter: {
        pattern: /(?=.*[a-z])/,
        get message(): string {
            return i18n.t('errors::Password must have at least 1 lowercase alphabetical character');
        },
    },

    validateUsernameLength: {
        pattern: /^.{5,150}$/u,
        get message(): string {
            return i18n.t('errors::Username must be between 5 and 150 characters');
        },
    },

    validateUsernameCharacters: {
        pattern: /^[\p{L}\p{N}_@.+-]+$/u,
        get message(): string {
            return i18n.t('errors::Only letters, numbers, and @/./+/-/_ characters are available');
        },
    },

    /*
        \p{Pd} - dash connectors
        \p{Pc} - connector punctuations
        \p{Cf} - invisible formatting indicator
        \p{L} - any alphabetic character
        Useful links:
        https://stackoverflow.com/questions/4323386/multi-language-input-validation-with-utf-8-encoding
        https://stackoverflow.com/questions/280712/javascript-unicode-regexes
        https://stackoverflow.com/questions/6377407/how-to-validate-both-chinese-unicode-and-english-name
    */
    validateName: {

        pattern: /^(\p{L}|\p{Pd}|\p{Cf}|\p{Pc}|['\s]){2,}$/gu,
        get message(): string {
            return i18n.t('errors::Invalid name');
        },
    },

    validateAttributeName: {
        pattern: /\S+/,
        get message(): string {
            return i18n.t('errors::Invalid name');
        },
    },

    validateLabelName: {
        pattern: /\S+/,
        get message(): string {
            return i18n.t('errors::Invalid name');
        },
    },

    validateAttributeValue: {
        pattern: /\S+/,
        get message(): string {
            return i18n.t('errors::Invalid attribute value');
        },
    },

    validateURL: {

        pattern: /^(https?:\/\/)[^\s$.?#].[^\s]*$/, // url, ip
        get message(): string {
            return i18n.t('errors::URL is not valid');
        },
    },

    validateOrganizationSlug: {
        pattern: /^[a-zA-Z\d]+$/,
        get message(): string {
            return i18n.t('errors::Only Latin characters and numbers are allowed');
        },
    },

    validatePhoneNumber: {
        pattern: /^[+]*[-\s0-9]*$/g,
        get message(): string {
            return i18n.t('errors::Input phone number is not correct');
        },
    },
};

export default validationPatterns;
