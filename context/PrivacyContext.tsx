'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
    isPrivate: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
    isPrivate: false,
    togglePrivacy: () => { },
});

export const PrivacyProvider = ({ children }: { children: React.ReactNode }) => {
    // Default to false, can persist in localStorage if desired
    const [isPrivate, setIsPrivate] = useState(false);

    // Optional: Persist to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('privacy_mode');
        if (saved) {
            setIsPrivate(saved === 'true');
        }
    }, []);

    const togglePrivacy = () => {
        setIsPrivate(prev => {
            const newValue = !prev;
            localStorage.setItem('privacy_mode', String(newValue));
            return newValue;
        });
    };

    return (
        <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = () => useContext(PrivacyContext);
