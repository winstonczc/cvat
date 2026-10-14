import React from 'react';
import Select from 'antd/lib/select';
import { useTranslation } from 'react-i18next';
import { handleDropdownKeyDown } from 'utils/dropdown-utils';

export interface MemberRoleSelectorProps {
    value: string | null;
    onChange: (role: string) => void;
    disabled?: boolean;
}

export default function MemberRoleSelector(props: Readonly<MemberRoleSelectorProps>): JSX.Element {
    const { value, onChange, disabled } = props;
    const { t } = useTranslation('organizations');

    // labels must be evaluated on each render to react to language switching
    const roleOptions = [
        { value: 'worker', label: t('Worker') },
        { value: 'supervisor', label: t('Supervisor') },
        { value: 'maintainer', label: t('Maintainer') },
        { value: 'owner', label: t('Owner') },
    ];

    return (
        <Select
            value={value}
            onChange={onChange}
            disabled={disabled || value === 'owner'}
            onKeyDown={handleDropdownKeyDown}
            className='cvat-organization-member-role-selector'
            placeholder={t('Select role')}
        >
            {value === 'owner' ? (
                <Select.Option value='owner'>{t('Owner')}</Select.Option>
            ) : (
                roleOptions.filter((option) => option.value !== 'owner').map((option) => (
                    <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
                ))
            )}
        </Select>
    );
}
