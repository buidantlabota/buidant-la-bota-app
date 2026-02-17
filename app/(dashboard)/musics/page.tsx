'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Music } from '@/types';

const INSTRUMENTS_LIST = [
    'Tuba',
    'Bombardí',
    'Trombó',
    'Trompeta',
    'Saxo Alt',
    'Saxo Tenor',
    'Saxo Baríton',
    'Percussió (Bombo)',
    'Percussió (Caixa)',
    'Percussió (Plats)',
    'Percussió (Bateria)',
    'Clarinet',
    'Flabiol',
    'Tible',
    'Tenora',
    'Fiscorn',
    'Gralla'
];

export default function MusicsPage() {
    const supabase = createClient();
    const [musics, setMusics] = useState<Music[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMusic, setEditingMusic] = useState<Music | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        nom: '',
        instruments: [] as string[],
        instrument_principal: '',
        talla_samarreta: '',
        talla_dessuadora: '',
        tipus: 'titular' as 'titular' | 'substitut',
        telefon_principal: '',
        telefons_addicionals: ''
    });

    const [filterTipus, setFilterTipus] = useState<'tots' | 'titular' | 'substitut'>('tots');
    const [filterInstrument, setFilterInstrument] = useState('');

    const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const uniqueInstruments = useMemo(() => {
        const set = new Set<string>();
        musics.forEach(m => {
            m.instruments.split(',').forEach(inst => {
                const cleaned = inst.trim();
                // Standardize "Túba" -> "Tuba" for the filter
                const normalized = normalize(cleaned);
                if (normalized === 'tuba') set.add('Tuba');
                else if (normalized === 'saxo' || normalized.includes('saxo')) {
                    // We'll keep specific ones but also ensure "Saxo" is an option
                    set.add(cleaned);
                    set.add('Saxo');
                }
                else set.add(cleaned);
            });
        });
        return Array.from(set).sort();
    }, [musics]);


    const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

    useEffect(() => {
        fetchMusics();
    }, []);

    const showToast = (message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    const fetchMusics = async (silent = false) => {
        if (!silent) setLoading(true);
        const { data, error } = await supabase
            .from('musics')
            .select('*')
            .order('nom', { ascending: true });

        if (error) {
            console.error('Error fetching musics:', error);
        } else {
            setMusics(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = (music?: Music) => {
        if (music) {
            setEditingMusic(music);
            setFormData({
                nom: music.nom,
                instruments: music.instruments ? music.instruments.split(',').map(i => i.trim()) : [],
                instrument_principal: music.instrument_principal || '',
                talla_samarreta: music.talla_samarreta || '',
                talla_dessuadora: music.talla_dessuadora || '',
                tipus: music.tipus || 'titular',
                telefon_principal: music.telefon_principal || '',
                telefons_addicionals: music.telefons_addicionals || ''
            });
        } else {
            setEditingMusic(null);
            setFormData({
                nom: '',
                instruments: [],
                instrument_principal: '',
                talla_samarreta: '',
                talla_dessuadora: '',
                tipus: 'titular',
                telefon_principal: '',
                telefons_addicionals: ''
            });
        }
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingMusic(null);
    };

    const handleSave = async () => {
        if (!formData.nom || formData.instruments.length === 0) {
            alert('El nom i almenys un instrument són obligatoris.');
            return;
        }

        const instrumentsString = formData.instruments.join(', ');

        try {
            if (editingMusic) {
                const { error } = await supabase
                    .from('musics')
                    .update({
                        nom: formData.nom,
                        instruments: instrumentsString,
                        instrument_principal: formData.instrument_principal,
                        talla_samarreta: formData.talla_samarreta,
                        talla_dessuadora: formData.talla_dessuadora,
                        tipus: formData.tipus,
                        telefon_principal: formData.telefon_principal,
                        telefons_addicionals: formData.telefons_addicionals
                    })
                    .eq('id', editingMusic.id);

                if (error) throw error;
                showToast('Músic actualitzat correctament.');
            } else {
                const { error } = await supabase
                    .from('musics')
                    .insert([{
                        nom: formData.nom,
                        instruments: instrumentsString,
                        instrument_principal: formData.instrument_principal,
                        talla_samarreta: formData.talla_samarreta,
                        talla_dessuadora: formData.talla_dessuadora,
                        tipus: formData.tipus,
                        telefon_principal: formData.telefon_principal,
                        telefons_addicionals: formData.telefons_addicionals
                    }]);

                if (error) throw error;
                showToast('Músic creat correctament.');
            }
            fetchMusics(true);
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving music detailed:', JSON.stringify(error, null, 2));
            console.error('Error object:', error);

            let msg = 'Error al desar el músic.';
            if (error?.code === '42P01') {
                msg = "L'error indica que la taula 'musics' no existeix. Recorda executar l'script SQL.";
            } else if (error?.code === '42501') {
                msg = "Error de permisos (RLS). Comprova que has iniciat sessió.";
            } else if (error?.message) {
                msg = `Error: ${error.message}`;
            }

            alert(msg);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Segur que vols eliminar aquest músic?')) return;

        try {
            const { error } = await supabase
                .from('musics')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Músic eliminat correctament.');
            fetchMusics(true);
        } catch (error) {
            console.error('Error deleting music:', error);
            alert("Error a l'eliminar el músic.");
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Toast */}
            {toast.show && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-950 uppercase tracking-tighter">Músics</h1>
                    <p className="text-gray-800 font-bold mt-2 bg-yellow-400/20 px-3 py-1 mr-auto rounded-md border border-yellow-500/30 text-sm">
                        Registre dels músics: instruments i talles de roba.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto bg-primary hover:bg-red-900 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center shadow-md active:scale-95"
                >
                    <span className="material-icons-outlined mr-2">add</span>
                    Afegir músic
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilterTipus('tots')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${filterTipus === 'tots' ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'}`}
                >
                    Tots
                </button>
                <button
                    onClick={() => setFilterTipus('titular')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${filterTipus === 'titular' ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'}`}
                >
                    Titulars
                </button>
                <button
                    onClick={() => setFilterTipus('substitut')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${filterTipus === 'substitut' ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'}`}
                >
                    Substituts
                </button>
            </div>

            {/* Instrument Filter */}
            <div className="mb-6">
                <select
                    value={filterInstrument}
                    onChange={(e) => setFilterInstrument(e.target.value)}
                    className="w-full sm:w-64 p-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                >
                    <option value="">Tots els instruments</option>
                    {uniqueInstruments.map(inst => (
                        <option key={inst} value={inst}>{inst}</option>
                    ))}
                </select>
            </div>


            {loading && musics.length === 0 ? (
                <div className="text-center text-text-secondary p-8">Carregant músics...</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white text-text-primary text-sm border-b border-border font-semibold">
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950">Nom</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950">Contacte</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950">Tipus</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950">Instruments</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950 text-center">Talla SMR</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950 text-center">Talla DESS</th>
                                    <th className="p-4 font-black uppercase text-xs tracking-widest text-gray-950 text-right">Accions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light">
                                {musics
                                    .filter(m => {
                                        // Filter by Tipus
                                        const tipusMatch = filterTipus === 'tots' || m.tipus === filterTipus || (!m.tipus && filterTipus === 'titular');

                                        // Filter by Instrument (Normalized)
                                        if (!tipusMatch) return false;
                                        if (!filterInstrument) return true;

                                        const normalizedMusicInstruments = normalize(m.instruments);
                                        const normalizedFilter = normalize(filterInstrument);

                                        // Broad match for Saxo
                                        if (normalizedFilter === 'saxo' && normalizedMusicInstruments.includes('saxo')) return true;
                                        // Standard check
                                        return normalizedMusicInstruments.includes(normalizedFilter);
                                    })
                                    .sort((a, b) => {
                                        // 1. Sort by Role: 'titular' first, then 'substitut'
                                        const roleA = a.tipus || 'titular';
                                        const roleB = b.tipus || 'titular';
                                        if (roleA !== roleB) {
                                            if (roleA === 'titular') return -1;
                                            if (roleB === 'titular') return 1;
                                        }

                                        // 2. Sort by Instrument Priority
                                        // const normalize = ... (declared above)

                                        const getPriority = (inst: string) => {
                                            const i = normalize(inst);
                                            if (i.includes('percussio') || i.includes('bateria') || i.includes('timbal') || i.includes('bombo') || i.includes('plat') || i.includes('caixa')) return 1;
                                            if (i.includes('trompeta')) return 2;
                                            if (i.includes('trombo')) return 3;
                                            if (i.includes('tuba') || i.includes('bombardi')) return 4;
                                            if (i.includes('saxo') && i.includes('alt')) return 5;
                                            if (i.includes('saxo') && i.includes('tenor')) return 6;
                                            if (i.includes('saxo')) return 7;
                                            if (i.includes('flabiol')) return 8;
                                            if (i.includes('tible')) return 9;
                                            if (i.includes('tenora')) return 10;
                                            if (i.includes('fiscorn')) return 11;
                                            if (i.includes('clarinet')) return 12;
                                            return 99;
                                        };
                                        const pA = getPriority(a.instruments);
                                        const pB = getPriority(b.instruments);
                                        if (pA !== pB) return pA - pB;

                                        // 3. Alphabetical fallback
                                        return a.nom.localeCompare(b.nom);
                                    })
                                    .map((music) => (
                                        <tr key={music.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-black text-gray-900">{music.nom}</td>
                                            <td className="p-4">
                                                {music.telefon_principal ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-900 font-bold text-sm">{music.telefon_principal}</span>
                                                        {music.telefons_addicionals && (
                                                            <span className="text-[10px] text-gray-600 font-bold" title={music.telefons_addicionals}>
                                                                + altres
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border-2 ${music.tipus === 'substitut'
                                                    ? 'bg-purple-600 text-white border-purple-700'
                                                    : 'bg-indigo-600 text-white border-indigo-700'
                                                    }`}>
                                                    {music.tipus || 'TITULAR'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-900 font-bold">{music.instruments}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-white border-2 border-gray-300 text-gray-950 px-2 py-1 rounded font-black text-xs">
                                                    {music.talla_samarreta || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="bg-gray-100 border-2 border-gray-400 text-gray-950 px-2 py-1 rounded font-black text-xs">
                                                    {music.talla_dessuadora || '-'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenModal(music)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(music.id)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors ml-2"
                                                >
                                                    <span className="material-icons-outlined text-lg align-middle">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    {musics.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-text-secondary">No hi ha músics registrats encara.</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="mt-4 text-primary font-medium hover:underline"
                            >
                                Afegeix el primer músic
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-md w-full my-8 shadow-xl border border-gray-200 max-h-[90vh] flex flex-col">
                        {/* Header with close button */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-text-primary">
                                {editingMusic ? 'Editar músic' : 'Nou músic'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Tancar"
                            >
                                <span className="material-icons-outlined text-gray-600">close</span>
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-text-secondary">Nom del músic</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-text-secondary">Instruments (selecciona un o més)</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        {INSTRUMENTS_LIST.map(inst => (
                                            <label key={inst} className="flex items-center space-x-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                                    checked={formData.instruments.includes(inst)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, instruments: [...formData.instruments, inst] });
                                                        } else {
                                                            const newInstruments = formData.instruments.filter(i => i !== inst);
                                                            const newPrincipal = formData.instrument_principal === inst ? '' : formData.instrument_principal;
                                                            setFormData({ ...formData, instruments: newInstruments, instrument_principal: newPrincipal });
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs font-bold text-gray-900">{inst}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {formData.instruments.length > 0 && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-bold mb-1 text-text-secondary">Instrument predeterminat</label>
                                        <select
                                            className="w-full p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-xs"
                                            value={formData.instrument_principal}
                                            onChange={(e) => setFormData({ ...formData, instrument_principal: e.target.value })}
                                        >
                                            <option value="">Cap seleccionat</option>
                                            {formData.instruments.map(inst => (
                                                <option key={inst} value={inst}>{inst}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-500 mt-1">Aquest instrument sortirà per defecte quan s'assigni el músic a un bolo.</p>
                                    </div>
                                )}


                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-950 mb-1">Talla Samarreta</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-950 font-bold focus:bg-white focus:border-primary outline-none transition-all shadow-sm"
                                            value={formData.talla_samarreta}
                                            onChange={(e) => setFormData({ ...formData, talla_samarreta: e.target.value.toUpperCase() })}
                                            placeholder="ex: L"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-950 mb-1">Talla Dessuadora</label>
                                        <input
                                            type="text"
                                            className="w-full p-2.5 rounded-lg bg-gray-50 border-2 border-gray-300 text-gray-950 font-bold focus:bg-white focus:border-primary outline-none transition-all shadow-sm"
                                            value={formData.talla_dessuadora}
                                            onChange={(e) => setFormData({ ...formData, talla_dessuadora: e.target.value.toUpperCase() })}
                                            placeholder="ex: XL"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-text-secondary">Tipus de músic</label>
                                    <select
                                        className="w-full p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.tipus}
                                        onChange={(e) => setFormData({ ...formData, tipus: e.target.value as any })}
                                    >
                                        <option value="titular">Titular</option>
                                        <option value="substitut">Substitut</option>
                                    </select>
                                </div>

                                <hr className="border-border my-4" />
                                <p className="text-xs text-text-secondary mb-4">
                                    Aquí guardem els telèfons de contacte del músic (titular o substitut).
                                </p>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-text-secondary">Telèfon principal</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.telefon_principal}
                                        onChange={(e) => setFormData({ ...formData, telefon_principal: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-text-secondary">Altres telèfons</label>
                                    <textarea
                                        className="w-full p-2 rounded bg-gray-50 border border-gray-300 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[60px]"
                                        value={formData.telefons_addicionals}
                                        onChange={(e) => setFormData({ ...formData, telefons_addicionals: e.target.value })}
                                        placeholder="Pots escriure més d'un número, separats per comes."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fixed footer with buttons */}
                        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 rounded text-text-secondary hover:bg-gray-200 transition-colors"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded bg-primary hover:bg-red-900 text-white font-medium transition-colors"
                            >
                                Desar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}

