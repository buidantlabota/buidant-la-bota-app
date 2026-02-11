'use client';

import { useState, useMemo } from 'react';
import { Music, BoloMusic } from '@/types';

interface AssistenciaMusicsProps {
    boloId: number;
    musics: Music[];
    attendance: BoloMusic[];
    onAdd: (musicIds: string[], type: 'titular' | 'substitut') => Promise<void>;
    onUpdateStatus: (musicId: string, status: string) => Promise<void>;
    onUpdateComment: (musicId: string, comment: string) => Promise<void>;
    onRemove: (attendanceId: string, musicId: string) => Promise<void>;
    onRequestMaterial: () => Promise<void>;
    isEditable: boolean;
}

const normalizeInstrument = (inst: string) => inst.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const getInstrumentPriority = (inst: string): number => {
    const i = normalizeInstrument(inst);
    // 1. Percussio
    if (i.includes('percussio') || i.includes('bateria') || i.includes('timbal') || i.includes('bombo') || i.includes('plat') || i.includes('caixa')) return 1;
    // 2. Trompeta
    if (i.includes('trompeta')) return 2;
    // 3. Trombo
    if (i.includes('trombo')) return 3;
    // 4. Tuba
    if (i.includes('tuba') || i.includes('bombardi')) return 4;
    // 5. Saxo Alt
    if (i.includes('saxo') && i.includes('alt')) return 5;
    // 6. Saxo Tenor
    if (i.includes('saxo') && i.includes('tenor')) return 6;
    // 7. Fallback Saxos
    if (i.includes('saxo')) return 7;
    // Cobla / Other
    if (i.includes('flabiol')) return 8;
    if (i.includes('tible')) return 9;
    if (i.includes('tenora')) return 10;
    if (i.includes('fiscorn')) return 11;
    if (i.includes('clarinet')) return 12;

    return 99;
};

export default function AssistenciaMusics({
    boloId,
    musics,
    attendance,
    onAdd,
    onUpdateStatus,
    onUpdateComment,
    onRemove,
    onRequestMaterial,
    isEditable
}: AssistenciaMusicsProps) {
    const [expandedTitulars, setExpandedTitulars] = useState(true);
    const [expandedSubstituts, setExpandedSubstituts] = useState(true);

    // Dialog State
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addType, setAddType] = useState<'titular' | 'substitut'>('titular');
    const [selectedMusicsToAdd, setSelectedMusicsToAdd] = useState<string[]>([]);
    const [filterInstrument, setFilterInstrument] = useState<string>('Tots');

    // -- Derived Data --
    const assignedIds = new Set(attendance.map(a => a.music_id));

    const availableMusics = useMemo(() => {
        return musics.filter(m => {
            if (assignedIds.has(m.id)) return false;
            if (m.tipus && m.tipus !== addType) return false;
            return true;
        });
    }, [musics, assignedIds, addType]);

    const allInstruments = useMemo(() => {
        const set = new Set<string>();
        musics.forEach(m => {
            m.instruments.split(',').forEach(i => set.add(i.trim()));
        });
        return Array.from(set).sort();
    }, [musics]);

    const displayedMusicsToAdd = useMemo(() => {
        let filtered = availableMusics;
        if (filterInstrument !== 'Tots') {
            filtered = filtered.filter(m =>
                normalizeInstrument(m.instruments).includes(normalizeInstrument(filterInstrument))
            );
        }
        return filtered.sort((a, b) => {
            const roleA = a.tipus || 'titular';
            const roleB = b.tipus || 'titular';
            if (roleA !== roleB) {
                if (roleA === 'titular') return -1;
                if (roleB === 'titular') return 1;
            }
            const prioA = getInstrumentPriority(a.instruments);
            const prioB = getInstrumentPriority(b.instruments);
            if (prioA !== prioB) return prioA - prioB;
            return a.nom.localeCompare(b.nom);
        });
    }, [availableMusics, filterInstrument]);

    const toggleSelection = (id: string) => {
        setSelectedMusicsToAdd(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedMusicsToAdd.length === displayedMusicsToAdd.length) {
            setSelectedMusicsToAdd([]);
        } else {
            setSelectedMusicsToAdd(displayedMusicsToAdd.map(m => m.id));
        }
    };

    const handleConfirmAdd = async () => {
        await onAdd(selectedMusicsToAdd, addType);
        setShowAddDialog(false);
        setSelectedMusicsToAdd([]);
    };

    const getSortedAttendance = (type: 'titular' | 'substitut') => {
        return attendance
            .filter(a => a.tipus === type)
            .map(a => {
                const music = musics.find(m => m.id === a.music_id);
                return { ...a, music };
            })
            .sort((a, b) => {
                const instA = a.music?.instruments || '';
                const instB = b.music?.instruments || '';
                const prioA = getInstrumentPriority(instA);
                const prioB = getInstrumentPriority(instB);

                if (prioA !== prioB) return prioA - prioB;
                return (a.music?.nom || '').localeCompare(b.music?.nom || '');
            });
    };

    const titularsList = getSortedAttendance('titular');
    const substitutsList = getSortedAttendance('substitut');
    const confirmedSubstitutsCount = substitutsList.filter(a => a.estat === 'confirmat').length;

    return (
        <div className="space-y-6">

            {/* -- Titulars -- */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
                <div
                    className="p-4 bg-white flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setExpandedTitulars(!expandedTitulars)}
                >
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark">Titulars</h3>
                            <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full text-gray-500 dark:text-text-secondary-dark font-mono">
                                {titularsList.length}
                            </span>
                            {isEditable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddType('titular');
                                        setShowAddDialog(true);
                                        setFilterInstrument('Tots');
                                        setSelectedMusicsToAdd([]);
                                    }}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary p-1 rounded-full transition-colors"
                                    title="Afegir titulars"
                                >
                                    <span className="material-icons-outlined text-lg">add</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <span className="material-icons-outlined text-gray-500 dark:text-text-secondary-dark">
                        {expandedTitulars ? 'expand_less' : 'expand_more'}
                    </span>
                </div>

                {expandedTitulars && (
                    <div className="p-4">
                        <MusiciansTable
                            items={titularsList}
                            isEditable={isEditable}
                            onUpdateStatus={onUpdateStatus}
                            onUpdateComment={onUpdateComment}
                            onRemove={onRemove}
                        />
                    </div>
                )}
            </div>

            {/* -- Substituts -- */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
                <div
                    className="p-4 bg-white flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setExpandedSubstituts(!expandedSubstituts)}
                >
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary-dark">Substituts</h3>
                            <span className="bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full text-gray-500 dark:text-text-secondary-dark font-mono">
                                {substitutsList.length}
                            </span>
                            {isEditable && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAddType('substitut');
                                        setShowAddDialog(true);
                                        setFilterInstrument('Tots');
                                        setSelectedMusicsToAdd([]);
                                    }}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary p-1 rounded-full transition-colors"
                                    title="Afegir substituts"
                                >
                                    <span className="material-icons-outlined text-lg">add</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <span className="material-icons-outlined text-gray-500 dark:text-text-secondary-dark">
                        {expandedSubstituts ? 'expand_less' : 'expand_more'}
                    </span>
                </div>

                {expandedSubstituts && (
                    <div className="p-4">
                        <MusiciansTable
                            items={substitutsList}
                            isEditable={isEditable}
                            onUpdateStatus={onUpdateStatus}
                            onUpdateComment={onUpdateComment}
                            onRemove={onRemove}
                        />
                        <div className="mt-4 flex flex-wrap gap-4 items-center">
                            {confirmedSubstitutsCount > 0 && (
                                <button
                                    onClick={onRequestMaterial}
                                    className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-3 py-1.5 rounded-lg transition-all ml-auto shadow-sm"
                                    title="Sol·licitar material necessari via n8n"
                                >
                                    <span className="material-icons-outlined text-sm">inventory_2</span>
                                    <span>Sol·licitar material</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* -- Add Musician Dialog -- */}
            {showAddDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                Afegir {addType === 'titular' ? 'Titulars' : 'Substituts'}
                            </h3>
                            <button onClick={() => setShowAddDialog(false)} className="text-gray-500 hover:text-gray-700">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-200 flex gap-4 bg-white">
                            <select
                                value={filterInstrument}
                                onChange={(e) => setFilterInstrument(e.target.value)}
                                className="flex-1 p-2 rounded border border-gray-300 bg-white text-gray-900 text-sm"
                            >
                                <option value="Tots">Tots els instruments</option>
                                {allInstruments.map(inst => (
                                    <option key={inst} value={inst}>{inst}</option>
                                ))}
                            </select>

                            <button
                                onClick={handleSelectAll}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded border border-gray-300 transition"
                            >
                                {selectedMusicsToAdd.length === displayedMusicsToAdd.length && displayedMusicsToAdd.length > 0
                                    ? 'Deseleccionar tots'
                                    : 'Seleccionar tots'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {displayedMusicsToAdd.length === 0 ? (
                                <p className="text-center text-gray-500 p-8">No hi ha músics disponibles amb aquest filtre.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {displayedMusicsToAdd.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => toggleSelection(m.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center space-x-3 transition-colors ${selectedMusicsToAdd.includes(m.id)
                                                ? 'bg-red-50 border-primary'
                                                : 'border-transparent hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selectedMusicsToAdd.includes(m.id) ? 'bg-primary border-primary' : 'border-gray-400'
                                                }`}>
                                                {selectedMusicsToAdd.includes(m.id) && <span className="material-icons-outlined text-white text-sm">check</span>}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{m.nom}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="material-icons-outlined text-[10px]">music_note</span>
                                                    {m.instruments}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 transition"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                disabled={selectedMusicsToAdd.length === 0}
                                className="px-4 py-2 rounded bg-primary text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                            >
                                Afegir {selectedMusicsToAdd.length} músics
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}

function MusiciansTable({ items, isEditable, onUpdateStatus, onUpdateComment, onRemove }: any) {
    if (items.length === 0) return <p className="text-sm text-gray-500 italic py-2">Cap músic assignat.</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-card-dark text-gray-900 dark:text-text-primary-dark uppercase text-xs font-semibold">
                    <tr>
                        <th className="px-4 py-2 font-medium">Músic</th>
                        <th className="px-4 py-2 font-medium w-32">Instruments</th>
                        <th className="px-4 py-2 font-medium w-24 text-right">Import</th>
                        <th className="px-4 py-2 font-medium w-40">Estat</th>
                        <th className="px-4 py-2 font-medium">Comentari</th>
                        {isEditable && <th className="px-4 py-2 w-10"></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item: any) => (
                        <MusicianRow
                            key={item.id}
                            item={item}
                            isEditable={isEditable}
                            onUpdateStatus={onUpdateStatus}
                            onUpdateComment={onUpdateComment}
                            onRemove={onRemove}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MusicianRow({ item, isEditable, onUpdateStatus, onUpdateComment, onRemove }: any) {
    const [localComment, setLocalComment] = useState(item.comentari || '');
    const [isEditingComment, setIsEditingComment] = useState(false);

    const handleBlurComment = () => {
        setIsEditingComment(false);
        if (localComment !== item.comentari) {
            onUpdateComment(item.music_id, localComment);
        }
    };

    const statusColors: Record<string, string> = {
        'pendent': 'bg-yellow-500 text-white font-bold shadow-sm',
        'confirmat': 'bg-green-600 text-white font-bold shadow-sm',
        'no': 'bg-red-600 text-white font-bold shadow-sm',
        'baixa': 'bg-gray-600 text-white font-bold shadow-sm'
    };

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
            <td className="px-4 py-3 font-medium text-gray-900">
                {item.music?.nom}
            </td>
            <td className="px-4 py-3 text-gray-500">
                <div className="flex items-center space-x-1">
                    <span className="material-icons-outlined text-xs">music_note</span>
                    <span>{item.music?.instruments}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                {item.import_assignat ?? 0}€
            </td>
            <td className="px-4 py-3">
                {isEditable ? (
                    <select
                        value={item.estat}
                        onChange={(e) => onUpdateStatus(item.music_id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-none focus:ring-1 focus:ring-offset-0 focus:ring-black/20 cursor-pointer ${statusColors[item.estat] || 'bg-gray-100'}`}
                    >
                        <option value="pendent">Pendent</option>
                        <option value="confirmat">Confirmat</option>
                        <option value="no">No</option>
                        <option value="baixa">Baixa</option>
                    </select>
                ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.estat] || 'bg-gray-100'}`}>
                        {item.estat}
                    </span>
                )}
            </td>
            <td className="px-4 py-3">
                {isEditingComment ? (
                    <input
                        autoFocus
                        type="text"
                        className="w-full text-sm p-1 rounded border border-primary bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        value={localComment}
                        onChange={(e) => setLocalComment(e.target.value)}
                        onBlur={handleBlurComment}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleBlurComment(); }}
                        placeholder="Escriu un comentari..."
                    />
                ) : (
                    <div
                        onClick={() => isEditable && setIsEditingComment(true)}
                        className={`text-sm cursor-pointer min-h-[1.5em] flex items-center ${!localComment ? 'text-gray-400 italic hover:text-gray-500' : 'text-gray-600 dark:text-gray-300'
                            }`}
                    >
                        {localComment || (isEditable ? 'Afegir comentari...' : '')}
                        {isEditable && (
                            <span className="material-icons-outlined text-[10px] ml-1 opacity-0 group-hover:opacity-50">edit</span>
                        )}
                    </div>
                )}
            </td>
            {isEditable && (
                <td className="px-4 py-3 text-right">
                    <button
                        onClick={() => onRemove(item.id, item.music_id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Eliminar del bolo"
                    >
                        <span className="material-icons-outlined text-lg">delete</span>
                    </button>
                </td>
            )}
        </tr>
    );
}
