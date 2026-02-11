"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

interface MunicipiValue {
    municipi_id?: string | null;
    municipi_custom_id?: string | null;
    municipi_text: string;
}

interface Suggestion {
    id: string;
    nom: string;
    comarca: string;
    provincia?: string;
    type: "catalog" | "custom";
}

interface MunicipiSelectorProps {
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    value: MunicipiValue | null;
    onChange: (value: MunicipiValue | null) => void;
    className?: string;
}

/**
 * Component GLOBAL de selecció de municipi.
 * Suporta catàleg oficial de Catalunya i entrada lliure.
 */
export function MunicipiSelector({
    label = "Municipi",
    placeholder = "Cerca un municipi o escriu-ne un...",
    required = false,
    disabled = false,
    value,
    onChange,
    className = "",
}: MunicipiSelectorProps) {
    const [inputValue, setInputValue] = useState(value?.municipi_text || "");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Sincronitzar amb el valor extern (ex: al carregar dades d'edició)
    useEffect(() => {
        if (value) {
            setInputValue(value.municipi_text);
        } else {
            setInputValue("");
        }
    }, [value]);

    const fetchSuggestions = async (q: string) => {
        if (q.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/municipis?q=${encodeURIComponent(q)}`);
            if (!res.ok) throw new Error("Error en la cerca");
            const data = await res.json();
            setSuggestions(data);
            setIsOpen(data.length > 0);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setInputValue(newVal);

        // Si s'esborra, informem al pare
        if (!newVal) {
            onChange(null);
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        // Informem al pare del text lliure actual
        // Nota: El pare haurà de cridar /resolve al submit per obtenir els IDs permanents si és text lliure
        onChange({
            municipi_id: null,
            municipi_custom_id: null,
            municipi_text: newVal
        });

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            fetchSuggestions(newVal);
        }, 250);
    };

    const handleSelect = (s: Suggestion) => {
        const selectedValue: MunicipiValue = {
            municipi_id: s.type === "catalog" ? s.id : null,
            municipi_custom_id: s.type === "custom" ? s.id : null,
            municipi_text: s.nom,
        };
        onChange(selectedValue);
        setInputValue(s.nom);
        setSuggestions([]);
        setIsOpen(false);
    };

    // Tancar dropdown al clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-1.5 ml-1 uppercase tracking-wider">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="group relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-200 text-gray-400 group-focus-within:text-blue-500">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Search className="h-5 w-5" />
                    )}
                </div>

                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className="block w-full pl-11 pr-10 py-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-xl leading-5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                />

                {inputValue && !disabled && (
                    <button
                        type="button"
                        onClick={() => {
                            setInputValue("");
                            onChange(null);
                            setSuggestions([]);
                            setIsOpen(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 mt-2 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl max-h-72 rounded-xl py-2 text-base overflow-auto focus:outline-none sm:text-sm">
                    {suggestions.map((s) => (
                        <li
                            key={`${s.type}-${s.id}`}
                            onClick={() => handleSelect(s)}
                            className="group cursor-pointer select-none relative py-3 pl-11 pr-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-white/5 mx-2 rounded-lg"
                        >
                            <div className="flex flex-col">
                                <div className="flex items-center">
                                    <MapPin className="absolute left-3.5 h-4.5 w-4.5 text-gray-400 group-hover:text-primary transition-colors" />
                                    <span className="block truncate font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">
                                        {s.nom}
                                    </span>
                                </div>
                                <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                                    {s.comarca} {s.provincia ? `· ${s.provincia}` : ""}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!isLoading && isOpen && suggestions.length === 0 && inputValue.length >= 2 && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 text-xs text-gray-500 dark:text-gray-400 rounded-xl shadow-xl">
                    No s'han trobat coincidències al catàleg. S'usarà com entrada lliure.
                </div>
            )}
        </div>
    );
}
