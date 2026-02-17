'use client';

import { usePrivacy } from '@/context/PrivacyContext';

interface PrivacyMaskProps {
    value: string | number | null;
    showEuro?: boolean;
    className?: string; // Allow passing text classes (font-bold, text-red-500, etc.)
}

export const PrivacyMask = ({ value, showEuro = true, className = '' }: PrivacyMaskProps) => {
    const { isPrivate } = usePrivacy();

    if (value === null || value === undefined) return <span className={className}>-</span>;

    if (isPrivate) {
        return <span className={`font-mono tracking-widest ${className}`}>****</span>;
    }

    let formatted = value;
    if (typeof value === 'number') {
        formatted = new Intl.NumberFormat('ca-ES', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    return (
        <span className={className}>
            {formatted}{showEuro ? ' €' : ''}
        </span>
    );
};
