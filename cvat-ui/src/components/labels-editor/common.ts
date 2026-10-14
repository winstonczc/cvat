// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';
import {
    SerializedLabel, SerializedAttribute, getCore, LabelType,
} from 'cvat-core-wrapper';

export interface SkeletonConfiguration {
    type: 'skeleton';
    svg: string;
    sublabels: SerializedLabel[];
}

export type LabelOptColor = SerializedLabel;

const core = getCore();
let id = 0;

// Number attributes store a [minimum, maximum, step] triple in "values"
// instead of a list of options.
export function validateNumberAttributeValues(values: string[]): void {
    if (values.length !== 3) {
        throw new Error(i18n.t('labels::three numbers are expected'));
    }

    const trimmed = values.map((value: string) => value.trim());
    const numbers = trimmed.map((value: string): number => (value.length ? Number(value) : NaN));
    const invalidIndex = numbers.findIndex((number: number) => !Number.isFinite(number));
    if (invalidIndex !== -1) {
        throw new Error(i18n.t('labels::"{{value}}" is not a number', { value: trimmed[invalidIndex] }));
    }

    const [min, max, step] = numbers;

    if (min >= max) {
        throw new Error(i18n.t('labels::minimum must be less than maximum'));
    }

    if (max - min < step) {
        throw new Error(i18n.t('labels::step must be less than minmax difference'));
    }

    if (step <= 0) {
        throw new Error(i18n.t('labels::step must be a positive number'));
    }
}

function validateParsedAttribute(attr: SerializedAttribute): void {
    if (typeof attr !== 'object' || attr === null) {
        throw new Error(i18n.t('labels::Attribute must be a JSON object'));
    }

    if (typeof attr.name !== 'string') {
        throw new Error(i18n.t('labels::Attribute name must be a string'));
    }

    if (attr.name.trim().length === 0) {
        throw new Error(i18n.t('labels::Attribute name must not be empty'));
    }

    if (typeof attr.id !== 'undefined' && !Number.isInteger(attr.id)) {
        throw new Error(i18n.t('labels::Attribute: "{{name}}": id must be an integer or undefined', { name: attr.name }));
    }

    if (!['checkbox', 'number', 'text', 'radio', 'select'].includes((attr.input_type ?? '').toLowerCase())) {
        throw new Error(i18n.t('labels::Attribute: "{{name}}": unknown input type: {{inputType}}', { name: attr.name, inputType: attr.input_type }));
    }

    if (typeof attr.mutable !== 'boolean') {
        throw new Error(i18n.t('labels::Attribute: "{{name}}": mutable property must be a boolean', { name: attr.name }));
    }

    if (!Array.isArray(attr.values) || !attr.values.length) {
        throw new Error(i18n.t('labels::Attribute: "{{name}}": attribute values must be a non-empty array', { name: attr.name }));
    }

    for (const value of attr.values) {
        if (typeof value !== 'string') {
            throw new Error(i18n.t('labels::Attribute: "{{name}}": each attribute value must be a string', { name: attr.name }));
        }
    }

    const attrValues = attr.values.map((value: string) => value.trim());
    if (attr.input_type.toLowerCase() === 'number') {
        try {
            validateNumberAttributeValues(attrValues);
        } catch (error: any) {
            throw new Error(i18n.t('labels::Attribute: "{{name}}": {{message}}', { name: attr.name, message: error.message }));
        }
    } else if (new Set(attrValues).size !== attrValues.length) {
        throw new Error(i18n.t('labels::Attribute: "{{name}}": attribute values must be unique', { name: attr.name }));
    }

    if (attr.default_value) {
        if (!core.utils.validateAttributeValue(attr.default_value, new core.classes.Attribute(attr))) {
            throw new Error(
                i18n.t('labels::Attribute: "{{name}}": invalid default value "{{value}}"', {
                    name: attr.name,
                    value: attr.default_value,
                }),
            );
        }
    }
}

export function validateParsedLabel(label: SerializedLabel): void {
    if (typeof label !== 'object' || label === null) {
        throw new Error(i18n.t('labels::Label must be a JSON object'));
    }

    if (typeof label.name !== 'string') {
        throw new Error(i18n.t('labels::Label name must be a string'));
    }

    if (label.name.trim().length === 0) {
        throw new Error(i18n.t('labels::Label name must not be empty'));
    }

    if (typeof label.id !== 'undefined' && !Number.isInteger(label.id)) {
        throw new Error(i18n.t('labels::Label "{{name}}": id must be an integer or undefined', { name: label.name }));
    }

    if (label.color && typeof label.color !== 'string') {
        throw new Error(i18n.t('labels::Label "{{name}}": color must be a string', { name: label.name }));
    }

    if (label.color && !label.color.match(/^#[0-9a-fA-F]{6}$|^$/)) {
        throw new Error(i18n.t('labels::Label "{{name}}": color value is invalid', { name: label.name }));
    }

    if (!Array.isArray(label.attributes)) {
        throw new Error(i18n.t('labels::Label "{{name}}": attributes must be an array', { name: label.name }));
    }

    for (const attr of label.attributes) {
        validateParsedAttribute(attr);
    }

    const attrNames = label.attributes.map((attr: SerializedAttribute) => attr.name.trim());
    if (new Set(attrNames).size !== attrNames.length) {
        throw new Error(i18n.t('labels::Label "{{name}}": attributes names must be unique', { name: label.name }));
    }

    if (!Object.values(LabelType).includes(label.type)) {
        throw new Error(i18n.t('labels::Label "{{name}}": unknown label type "{{type}}"', { name: label.name, type: label.type }));
    }

    if (label.type === LabelType.SKELETON) {
        if (!Array.isArray(label.sublabels) || label.sublabels.length === 0) {
            throw new Error(i18n.t('labels::Label "{{name}}": skeletons must provide non-empty sublabels array', { name: label.name }));
        }

        for (const sublabel of label.sublabels) {
            validateParsedLabel(sublabel);
        }

        const sublabelsNames = label.sublabels.map((sublabel: SerializedLabel) => sublabel.name.trim());
        if (new Set(sublabelsNames).size !== sublabelsNames.length) {
            throw new Error(i18n.t('labels::Label "{{name}}": sublabels names must be unique', { name: label.name }));
        }

        if (typeof label.svg !== 'string') {
            throw new Error(i18n.t('labels::Label "{{name}}": skeletons must provide a correct SVG template', { name: label.name }));
        }

        const sublabelIds = label.sublabels
            .map((sublabel: SerializedLabel) => sublabel.id)
            .filter((sublabelId: number | undefined) => sublabelId !== undefined);
        const matches = label.svg.matchAll(/data-label-id="([\d]+)"/g);
        for (const match of matches) {
            const refersToId = +match[1];
            if (!sublabelIds.includes(refersToId)) {
                throw new Error(
                    i18n.t(
                        'labels::Label "{{name}}": skeletons SVG refers to sublabel with id {{id}}, ' +
                        'which is not present in the sublabels array',
                        { name: label.name, id: refersToId },
                    ),
                );
            }
        }
    }
}

export function idGenerator(): number {
    return --id;
}

export function equalArrayHead(arr1: string[], arr2: string[]): boolean {
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}

export function toSVGCoord(svg: SVGSVGElement, coord: number[], raiseError = false): number[] {
    const result = [];
    const ctm = svg.getScreenCTM();

    if (!ctm) {
        if (raiseError) throw new Error('Screen CTM is null');
        return coord;
    }

    const inversed = ctm.inverse();
    if (!inversed) {
        if (raiseError) throw new Error('Inversed screen CTM is null');
        return coord;
    }

    for (let i = 0; i < coord.length; i += 2) {
        let point = svg.createSVGPoint();
        point.x = coord[i];
        point.y = coord[i + 1];
        point = point.matrixTransform(inversed);
        result.push(point.x, point.y);
    }

    return result;
}

export function fromSVGCoord(svg: SVGSVGElement, coord: number[], raiseError = false): number[] {
    const result = [];
    const ctm = svg.getScreenCTM();
    if (!ctm) {
        if (raiseError) throw new Error('Inversed screen CTM is null');
        return coord;
    }

    for (let i = 0; i < coord.length; i += 2) {
        let point = svg.createSVGPoint();
        point.x = coord[i];
        point.y = coord[i + 1];
        point = point.matrixTransform(ctm);
        result.push(point.x, point.y);
    }

    return result;
}
