// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import i18n from 'i18next';

/**
 * Translation of cvat-core enum values that are rendered verbatim in the UI
 * (JobState, JobStage, ShapeType, LabelType, Source, SortingMethod, ...).
 *
 * cvat-core is a shared library and its enum values must not change (they are
 * part of the API contract), so the mapping lives here, in the UI layer.
 * Render sites call `enumLabel(value)` instead of rendering `{value}`.
 *
 * Keys live in the `enum` namespace (`src/locales/<lang>/enum.json`) and are
 * the raw enum value, e.g. "in progress". Missing keys fall back to the raw
 * value, keeping English output byte-identical to the pre-i18n behavior.
 */
export function enumLabel(value: string | undefined | null): string {
    if (value === undefined || value === null) return '';
    return i18n.t(`enum::${value}`, { defaultValue: value });
}

export default enumLabel;
