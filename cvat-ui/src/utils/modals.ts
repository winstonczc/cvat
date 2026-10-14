// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import Modal from 'antd/lib/modal';
import i18n from 'i18next';

import { Organization, Project, Task } from 'cvat-core-wrapper';

export function confirmTransferModal(
    instances: Project[] | Task[],
    activeWorkspace: Organization | null,
    dstWorkspace: Organization | null,
    onOk: () => void,
): void {
    const first = instances[0];
    if (!first) {
        return;
    }

    const instanceType = first instanceof Task ? 'task' : 'project';
    let movingItems: string;
    if (instances.length > 1) {
        movingItems = instanceType === 'task' ?
            i18n.t('errors::{{count}} tasks', { count: instances.length }) :
            i18n.t('errors::{{count}} projects', { count: instances.length });
    } else {
        movingItems = instanceType === 'task' ?
            i18n.t('errors::the task #{{id}}', { id: first.id }) :
            i18n.t('errors::the project #{{id}}', { id: first.id });
    }
    let details = dstWorkspace ?
        i18n.t('errors::You are going to move {{items}} to the organization {{slug}}.', {
            items: movingItems,
            slug: dstWorkspace.slug,
        }) :
        i18n.t('errors::You are going to move {{items}} to the personal workspace.', { items: movingItems });
    if (activeWorkspace) {
        details += ` ${instances.length > 1 ?
            i18n.t('errors::Organization members will lose access to these resources.') :
            i18n.t('errors::Organization members will lose access to this resource.')}`;
    }

    Modal.confirm({
        title: i18n.t('errors::Data transfer between workspaces'),
        content: `${details} ${i18n.t('errors::Would you like to proceed?')}`,
        className: 'cvat-modal-confirm-project-transfer-between-workspaces',
        onOk,
        okButtonProps: {
            type: 'primary',
            danger: true,
        },
        okText: i18n.t('errors::Continue'),
    });
}
