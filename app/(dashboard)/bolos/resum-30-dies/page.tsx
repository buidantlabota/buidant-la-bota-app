'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bolo, Music, BoloMusic } from '@/types';
import Link from 'next/link';

interface BoloWithMusicians extends Bolo {
    musicians: (BoloMusic & { music: Music })[];
}

// Definició de seccions d'instruments
const SECTIONS = [
    { key: 'Percu', label: 'Percu', whatsappLabel: 'Percu:' },
    { key: 'Trompeta', label: 'Trompeta', whatsappLabel: 'Trompeta:' },
    { key: 'Trombó', label: 'Trombó', whatsappLabel: 'Trombó:' },
    { key: 'Saxo', label: 'Saxo', whatsappLabel: 'Saxo:' },
    { key: 'Tenor', label: 'Tenor', whatsappLabel: 'Terror:' },
    { key: 'Tuba', label: 'Tuba', whatsappLabel: 'Tuba:' },
] as const;

export default function Resum30DiesPage() {
    const supabase = createClient();
    const [bolos, setBolos] = useState<BoloWithMusicians[]>([]);
    const [allMusics, setAllMusics] = useState<Music[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBolo, setExpandedBolo] = useState<number | null>(null);
    const [whatsappText, setWhatsappText] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        generateWhatsAppText();
    }, [bolos]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Fetch bolos dels propers 30 dies
            const today = new Date().toISOString().split('T')[0];
            const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data: bolosData, error: bolosError } = await supabase
                .from('bolos')
                .select(`
                    *,
                    bolo_musics (
                        *,
                        musics (*)
                    )
                `)
                .gte('data_bolo', today)
                .lte('data_bolo', in30Days)
                .neq('estat', 'Cancel·lat')
                .order('data_bolo', { ascending: true })
                .order('hora_inici', { ascending: true });

            if (bolosError) throw bolosError;

            // Processar dades
            const processedBolos = (bolosData || []).map((bolo: any) => ({
                ...bolo,
                musicians: (bolo.bolo_musics || []).map((bm: any) => ({
                    ...bm,
                    music: bm.musics
                }))
            }));

            setBolos(processedBolos);

            // Fetch tots els músics
            const { data: musicsData, error: musicsError } = await supabase
                .from('musics')
                .select('*')
                .order('instruments')
                .order('nom');

            if (musicsError) throw musicsError;
            setAllMusics(musicsData || []);
        } catch (error: any) {
            console.error('Error fetching data:', error?.message || error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMusician = async (boloId: number, musicId: string, isAssigned: boolean) => {
        try {
            if (isAssigned) {
                // Eliminar assignació
                const { error } = await supabase
                    .from('bolo_musics')
                    .delete()
                    .eq('bolo_id', boloId)
                    .eq('music_id', musicId);

                if (error) throw error;
            } else {
                // Afegir assignació
                const { error } = await supabase
                    .from('bolo_musics')
                    .insert([{
                        bolo_id: boloId,
                        music_id: musicId,
                        tipus: 'titular',
                        estat: 'confirmat',
                        import_assignat: 0
                    }]);

                if (error) throw error;
            }

            fetchData(true);
        } catch (error: any) {
            console.error('Error toggling musician:', error?.message || error);
        }
    };

    const handleUpdateBoloField = async (boloId: number, field: string, value: any) => {
        try {
            const { error } = await supabase
                .from('bolos')
                .update({ [field]: value })
                .eq('id', boloId);

            if (error) throw error;

            // Actualitzar estat local
            setBolos(prev => prev.map(b =>
                b.id === boloId ? { ...b, [field]: value } : b
            ));
        } catch (error: any) {
            console.error('Error updating bolo:', error?.message || error);
        }
    };

    const handleUpdateMusicianNote = async (boloId: number, musicId: string, note: string) => {
        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ comentari: note })
                .eq('bolo_id', boloId)
                .eq('music_id', musicId);

            if (error) throw error;
            fetchData(true);
        } catch (error: any) {
            console.error('Error updating musician note:', error?.message || error);
        }
    };

    const handleUpdateMusicianStatus = async (boloId: number, musicId: string, status: string) => {
        try {
            const { error } = await supabase
                .from('bolo_musics')
                .update({ estat: status })
                .eq('bolo_id', boloId)
                .eq('music_id', musicId);

            if (error) throw error;
            fetchData(true);
        } catch (error: any) {
            console.error('Error updating musician status:', error?.message || error);
        }
    };

    const getMusiciansBySection = (bolo: BoloWithMusicians, sectionKey: string) => {
        const normalizedSection = sectionKey.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return bolo.musicians
            .filter(bm => {
                // 1. Check for explicit override in comentari: "[SectionName]"
                if (bm.comentari && bm.comentari.startsWith('[') && bm.comentari.includes(']')) {
                    const match = bm.comentari.match(/^\[(.*?)\].*/);
                    if (match) {
                        const override = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return override === normalizedSection;
                    }
                }

                if (!bm.music || !bm.music.instruments) return false;
                const normalizedInst = bm.music.instruments.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                // Exclude if it belongs to another specific section via override
                if (bm.comentari && bm.comentari.startsWith('[') && bm.comentari.includes(']')) {
                    return false; // Already handled by override check above
                }

                // Broad match for Saxo
                if (normalizedSection === 'saxo' && normalizedInst.includes('saxo')) {
                    return true;
                }

                return normalizedInst.includes(normalizedSection);
            })
            .sort((a, b) => {
                // 1. Tipus: titular abans que substitut
                const tipusA = a.tipus || 'titular';
                const tipusB = b.tipus || 'titular';
                if (tipusA !== tipusB) {
                    return tipusA === 'titular' ? -1 : 1;
                }
                // 2. Nom
                return (a.music?.nom || '').localeCompare(b.music?.nom || '');
            });
    };

    const getAvailableMusiciansBySection = (sectionKey: string, assignedIds: string[]) => {
        return allMusics
            .filter(m => m.instruments?.includes(sectionKey) && !assignedIds.includes(m.id))
            .sort((a, b) => a.nom.localeCompare(b.nom));
    };

    const generateWhatsAppText = () => {
        let text = '';

        bolos.forEach(bolo => {
            const totalMusics = bolo.musicians.length;
            const boloName = bolo.tipus_actuacio || bolo.municipi_text || bolo.nom_poble;
            const date = new Date(bolo.data_bolo).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });

            const statusIcon = bolo.lineup_confirmed ? '✅' : '⏳';
            text += `${statusIcon} ${boloName} ${date} -${totalMusics}\n\n`;

            // Seccions
            SECTIONS.forEach(section => {
                const musicians = getMusiciansBySection(bolo, section.key);
                if (musicians.length > 0) {
                    const names = musicians.map(bm => {
                        const name = bm.music?.nom || '';
                        let displayNote = bm.comentari || '';
                        // Strip section override like [Saxo] 
                        if (displayNote.startsWith('[')) {
                            displayNote = displayNote.replace(/^\[.*?\]\s*/, '');
                        }
                        const note = displayNote ? ` (${displayNote})` : '';
                        return name + note;
                    }).join(', ');
                    text += `${section.whatsappLabel} ${names}\n`;
                }
            });

            if (bolo.lineup_no_pot) {
                text += `\n🚫 No pot: ${bolo.lineup_no_pot}`;
            }
            if (bolo.lineup_pendent) {
                text += `\n🤷‍♂️ Pendent: ${bolo.lineup_pendent}`;
            }

            text += '\n\n---\n\n';
        });

        setWhatsappText(text);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(whatsappText);
        alert('Text copiat al porta-retalls!');
    };

    if (loading && bolos.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 mt-8 mx-auto max-w-7xl animate-pulse">
                <span className="material-icons-outlined text-4xl mb-2">sync</span>
                <p className="font-medium">Carregant previsió de músics...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Resum 30 Dies - Previsió de Músics</h1>
                <p className="text-gray-500 mt-1">
                    Gestiona la formació dels propers {bolos.length} bolos
                </p>
            </div>

            {/* Bolos List */}
            <div className="space-y-4 mb-8">
                {bolos.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <span className="material-icons-outlined text-6xl text-gray-300 mb-4">event_available</span>
                        <p className="text-gray-500">No hi ha bolos programats pels propers 30 dies</p>
                    </div>
                ) : (
                    bolos.map(bolo => {
                        const isExpanded = expandedBolo === bolo.id;
                        const totalMusics = bolo.musicians.length;
                        const assignedMusicIds = bolo.musicians.map(bm => bm.music_id);

                        return (
                            <div
                                key={bolo.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                            >
                                {/* Header del Bolo */}
                                <div
                                    className="px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-colors"
                                    onClick={() => setExpandedBolo(isExpanded ? null : bolo.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold text-gray-900">
                                                    {bolo.tipus_actuacio || bolo.municipi_text || bolo.nom_poble}
                                                </h3>
                                                <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                                    -{totalMusics}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-icons-outlined text-sm">event</span>
                                                    {new Date(bolo.data_bolo).toLocaleDateString('ca-ES', {
                                                        weekday: 'short',
                                                        day: 'numeric',
                                                        month: 'short'
                                                    })}
                                                </span>
                                                {bolo.hora_inici && (
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-icons-outlined text-sm">schedule</span>
                                                        {bolo.hora_inici}
                                                    </span>
                                                )}
                                                <Link
                                                    href={`/bolos/${bolo.id}`}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <span className="material-icons-outlined text-sm">open_in_new</span>
                                                    Veure detall
                                                </Link>
                                            </div>
                                        </div>

                                        <button className="p-2 hover:bg-white/50 rounded-full transition-colors">
                                            <span className={`material-icons-outlined transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Contingut Expandit */}
                                {isExpanded && (
                                    <div className="p-6 space-y-6">

                                        {/* Lineup Config Section */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-wrap gap-6 items-start">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase text-gray-400">Estat Lineup</span>
                                                <button
                                                    onClick={() => handleUpdateBoloField(bolo.id, 'lineup_confirmed', !bolo.lineup_confirmed)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${bolo.lineup_confirmed
                                                        ? 'bg-green-600 text-white shadow-[0_2px_0_0_rgba(21,128,61,1)]'
                                                        : 'bg-yellow-500 text-white shadow-[0_2px_0_0_rgba(161,98,7,1)]'
                                                        }`}
                                                >
                                                    <span className="material-icons-outlined text-sm">
                                                        {bolo.lineup_confirmed ? 'check_circle' : 'hourglass_empty'}
                                                    </span>
                                                    {bolo.lineup_confirmed ? 'LINEUP CONFIRMAT' : 'PENDENT DE CONFIRMAR'}
                                                </button>
                                            </div>

                                            <div className="flex-1 min-w-[200px] flex flex-col md:flex-row gap-4">
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                                                        <span className="material-icons-outlined text-[12px]">block</span> No pot:
                                                    </span>
                                                    <input
                                                        type="text"
                                                        placeholder="Miquel, Joan (exàmens)..."
                                                        className="w-full p-2 rounded border border-gray-200 bg-white text-sm"
                                                        value={bolo.lineup_no_pot || ''}
                                                        onChange={(e) => {
                                                            setBolos(prev => prev.map(b => b.id === bolo.id ? { ...b, lineup_no_pot: e.target.value } : b));
                                                        }}
                                                        onBlur={(e) => handleUpdateBoloField(bolo.id, 'lineup_no_pot', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">
                                                        <span className="material-icons-outlined text-[12px]">help_outline</span> Pendent:
                                                    </span>
                                                    <input
                                                        type="text"
                                                        placeholder="Enric (per confirmar feina)..."
                                                        className="w-full p-2 rounded border border-gray-200 bg-white text-sm"
                                                        value={bolo.lineup_pendent || ''}
                                                        onChange={(e) => {
                                                            setBolos(prev => prev.map(b => b.id === bolo.id ? { ...b, lineup_pendent: e.target.value } : b));
                                                        }}
                                                        onBlur={(e) => handleUpdateBoloField(bolo.id, 'lineup_pendent', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seccions d'Instruments */}
                                        <div className="space-y-4">
                                            {SECTIONS.map(section => {
                                                const assigned = getMusiciansBySection(bolo, section.key);
                                                const available = getAvailableMusiciansBySection(section.key, assignedMusicIds);

                                                return (
                                                    <div key={section.key} className="border border-gray-200 rounded-lg p-4">
                                                        <h4 className="font-semibold text-gray-900 mb-3">{section.label}</h4>

                                                        {/* Músics Assignats */}
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {assigned.length === 0 ? (
                                                                <span className="text-sm text-gray-400 italic">Cap músic assignat</span>
                                                            ) : (
                                                                assigned.map(bm => (
                                                                    <div
                                                                        key={bm.music_id}
                                                                        className="group flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                                                                    >
                                                                        <div className="flex flex-col items-start leading-none min-w-0">
                                                                            <span className="font-bold truncate max-w-[120px]">{bm.music?.nom}</span>
                                                                            {bm.comentari && !bm.comentari.startsWith('[') && (
                                                                                <span className="text-[10px] opacity-70 italic truncate max-w-[120px]">{bm.comentari}</span>
                                                                            )}
                                                                            {bm.comentari && bm.comentari.startsWith('[') && bm.comentari.includes('] ') && (
                                                                                <span className="text-[10px] opacity-70 italic truncate max-w-[120px]">{bm.comentari.split('] ')[1]}</span>
                                                                            )}
                                                                        </div>

                                                                        {/* Section Picker for "Moving" */}
                                                                        <select
                                                                            className="bg-transparent border-none text-[10px] p-0 font-black uppercase opacity-0 group-hover:opacity-60 focus:opacity-100 cursor-pointer outline-none"
                                                                            value={section.label}
                                                                            onChange={(e) => {
                                                                                const newSec = e.target.value;
                                                                                if (newSec === section.label) return;

                                                                                // Clean current comment from any [Section] prefix
                                                                                let cleanNote = bm.comentari || '';
                                                                                if (cleanNote.startsWith('[')) {
                                                                                    cleanNote = cleanNote.replace(/^\[.*?\]\s*/, '');
                                                                                }

                                                                                if (newSec === 'Reset') {
                                                                                    handleUpdateMusicianNote(bolo.id, bm.music_id, cleanNote);
                                                                                } else {
                                                                                    const updatedNote = `[${newSec}] ${cleanNote}`.trim();
                                                                                    handleUpdateMusicianNote(bolo.id, bm.music_id, updatedNote);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="" disabled>Moure a...</option>
                                                                            {SECTIONS.map(s => (
                                                                                <option key={s.key} value={s.label}>{s.label}</option>
                                                                            ))}
                                                                            <option value="Reset">Original</option>
                                                                        </select>

                                                                        <button
                                                                            onClick={() => handleToggleMusician(bolo.id, bm.music_id, true)}
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                                                            title="Eliminar"
                                                                        >
                                                                            <span className="material-icons-outlined text-sm">close</span>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Músics Disponibles */}
                                                        {available.length > 0 && (
                                                            <details className="text-sm">
                                                                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                                                                    + Afegir músic ({available.length} disponibles)
                                                                </summary>
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {available.map(music => (
                                                                        <button
                                                                            key={music.id}
                                                                            onClick={() => handleToggleMusician(bolo.id, music.id, false)}
                                                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                                                                        >
                                                                            + {music.nom}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bloc Resum WhatsApp */}
            {bolos.length > 0 && (
                <div className="bg-green-50 rounded-xl border-2 border-green-200 overflow-hidden">
                    <div className="px-6 py-4 bg-green-100 border-b border-green-200 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-green-900 flex items-center gap-2">
                            <span className="material-icons-outlined">chat</span>
                            Resum per WhatsApp
                        </h2>
                        <button
                            onClick={copyToClipboard}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
                        >
                            <span className="material-icons-outlined text-sm">content_copy</span>
                            Copiar
                        </button>
                    </div>
                    <div className="p-6">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-white p-4 rounded-lg border border-green-200">
                            {whatsappText}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
