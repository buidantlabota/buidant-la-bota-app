'use client';

import { useState } from 'react';
import { BoloTasca, BoloStatus, Bolo } from '@/types';
import { createClient } from '@/utils/supabase/client';

interface TasquesPerFaseProps {
    boloId: number;
    bolo: Bolo;
    faseActual: BoloStatus;
    tasques: BoloTasca[];
    onTasquesChange: () => void;
    onSystemTaskToggle: (field: keyof Bolo, value: boolean) => void;
    isEditable: boolean;
}

const SYSTEM_TASKS: { field: keyof Bolo; label: string; fase: BoloStatus }[] = [
    // Nova
    { field: 'disponibilitat_comprovada', label: 'Disponibilitat comprovada', fase: 'Nova' },
    { field: 'fitxa_client_completa', label: 'Fitxa client completa', fase: 'Nova' },

    // Pendent de confirmació
    { field: 'pressupost_enviat', label: 'Pressupost enviat', fase: 'Pendent de confirmació' },
    { field: 'enquesta_enviada', label: 'Enquesta enviada', fase: 'Pendent de confirmació' },

    // Confirmada
    { field: 'pressupost_acceptat', label: 'Pressupost acceptat', fase: 'Confirmada' },
    { field: 'convocatoria_enviada', label: 'Convocatòria enviada', fase: 'Confirmada' },
    { field: 'enquesta_disponibilitat_musics_enviada', label: 'Enquesta disponibilitat músics enviada', fase: 'Confirmada' },
    { field: 'calendari_actualitzat', label: 'Calendari actualitzat', fase: 'Confirmada' },
    { field: 'material_organitzat', label: 'Material organitzat', fase: 'Confirmada' },

    // Pendents de cobrar
    { field: 'actuacio_acabada', label: 'Actuació acabada', fase: 'Pendents de cobrar' },
    { field: 'factura_enviada', label: 'Factura enviada', fase: 'Pendents de cobrar' },

    // Per pagar
    { field: 'cobrat', label: 'Cobrat', fase: 'Per pagar' },
    { field: 'pagaments_musics_planificats', label: 'Pagaments músics planificats', fase: 'Per pagar' },

    // Tancades
    { field: 'pagaments_musics_fets', label: 'Pagaments músics fets', fase: 'Tancades' },
    { field: 'bolo_arxivat', label: 'Bolo arxivat', fase: 'Tancades' }
];

interface SystemTaskConfig {
    field: keyof Bolo;
    label: string;
    fase: BoloStatus;
}

export function TasquesPerFase({
    boloId,
    bolo,
    faseActual,
    tasques,
    onTasquesChange,
    onSystemTaskToggle,
    isEditable
}: TasquesPerFaseProps) {
    const supabase = createClient();
    const [updating, setUpdating] = useState(false);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<BoloTasca | null>(null);
    const [newTask, setNewTask] = useState({
        titol: '',
        descripcio: '',
        importancia: 'mitjana' as 'baixa' | 'mitjana' | 'alta',
        obligatoria: false
    });

    // 1. Get Manual Tasks grouped by phase
    const manualTasksPerFase: Record<string, BoloTasca[]> = {
        'Nova': tasques.filter(t => t.fase_associada === 'Nova' || t.fase_associada === 'Sol·licitat'),
        'Pendent de confirmació': tasques.filter(t => t.fase_associada === 'Pendent de confirmació'),
        'Confirmada': tasques.filter(t => t.fase_associada === 'Confirmada' || t.fase_associada === 'Confirmat'),
        'Pendents de cobrar': tasques.filter(t => t.fase_associada === 'Pendents de cobrar'),
        'Per pagar': tasques.filter(t => t.fase_associada === 'Per pagar'),
        'Tancades': tasques.filter(t => t.fase_associada === 'Tancades' || t.fase_associada === 'Tancat'),
        'Cancel·lat': tasques.filter(t => t.fase_associada === 'Cancel·lat')
    };

    // 2. Get System Tasks for current phase
    const systemTasksForPhase = SYSTEM_TASKS.filter(st => st.fase === faseActual);

    // 3. Get Manual Tasks for current phase
    const manualTasksForPhase = manualTasksPerFase[faseActual] || [];

    const tasquesPendentsAltresFases = tasques.filter(
        t => t.fase_associada !== faseActual && !t.completada
    );

    // Find pending system tasks from previous phases
    const faseOrder: Record<string, number> = {
        'Nova': 1, 'Sol·licitat': 1,
        'Pendent de confirmació': 2,
        'Confirmada': 3, 'Confirmat': 3,
        'Pendents de cobrar': 4,
        'Per pagar': 5,
        'Tancades': 6, 'Tancat': 6,
        'Cancel·lat': 7
    };

    const currentOrder = faseOrder[faseActual] || 0;
    const pendingSystemTasks = SYSTEM_TASKS.filter(st => {
        const taskPhaseOrder = faseOrder[st.fase] || 0;
        return taskPhaseOrder < currentOrder && !bolo[st.field];
    });

    const handleToggleTask = async (taskId: string, currentState: boolean) => {
        if (!isEditable) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('bolo_tasques')
                .update({
                    completada: !currentState,
                    data_completada: !currentState ? new Date().toISOString() : null
                })
                .eq('id', taskId);

            if (error) throw error;
            onTasquesChange();
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleSystemTask = (field: keyof Bolo, currentValue: boolean) => {
        if (!isEditable) return;
        onSystemTaskToggle(field, !currentValue);
    };

    const handleSaveTask = async () => {
        if (!newTask.titol.trim()) return;

        setUpdating(true);
        try {
            if (editingTask) {
                const { error } = await supabase
                    .from('bolo_tasques')
                    .update({
                        titol: newTask.titol,
                        descripcio: newTask.descripcio || null,
                        importancia: newTask.importancia,
                        obligatoria: newTask.obligatoria
                    })
                    .eq('id', editingTask.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bolo_tasques')
                    .insert([{
                        bolo_id: boloId,
                        titol: newTask.titol,
                        descripcio: newTask.descripcio || null,
                        fase_associada: faseActual,
                        importancia: newTask.importancia,
                        obligatoria: newTask.obligatoria,
                        origen: 'manual',
                        ordre: manualTasksForPhase.length + 1
                    }]);

                if (error) throw error;
            }

            setNewTask({ titol: '', descripcio: '', importancia: 'mitjana', obligatoria: false });
            setShowAddTaskModal(false);
            setEditingTask(null);
            onTasquesChange();
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleEditTask = (task: BoloTasca) => {
        setEditingTask(task);
        setNewTask({
            titol: task.titol,
            descripcio: task.descripcio || '',
            importancia: task.importancia,
            obligatoria: task.obligatoria
        });
        setShowAddTaskModal(true);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Segur que vols eliminar aquesta tasca?')) return;

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('bolo_tasques')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            onTasquesChange();
        } catch (error) {
            console.error('Error deleting task:', error);
        } finally {
            setUpdating(false);
        }
    };

    const getImportanceBadge = (importancia: string) => {
        const colors = {
            baixa: 'bg-gray-100 text-gray-600',
            mitjana: 'bg-blue-100 text-blue-600',
            alta: 'bg-red-100 text-red-600'
        };
        return colors[importancia as keyof typeof colors] || colors.mitjana;
    };

    const isDuplicateTask = (manualTitle: string) => {
        const normalizedManual = manualTitle.toLowerCase().replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, "");
        return SYSTEM_TASKS.some(st => {
            const normalizedSystem = st.label.toLowerCase().replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, "");
            return normalizedManual.includes(normalizedSystem) || normalizedSystem.includes(normalizedManual) ||
                (normalizedManual.includes('pagaments') && normalizedSystem.includes('pagaments') && normalizedManual.includes('fets') && normalizedSystem.includes('fets')) ||
                (normalizedManual.includes('pagaments') && normalizedSystem.includes('pagaments') && normalizedManual.includes('planificats') && normalizedSystem.includes('planificats'));
        });
    };

    const renderManualTask = (task: BoloTasca, showPhaseLabel = false) => {
        if (isDuplicateTask(task.titol)) return null;

        return (
            <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${task.completada
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
            >
                <input
                    type="checkbox"
                    checked={task.completada}
                    onChange={() => handleToggleTask(task.id, task.completada)}
                    disabled={!isEditable || updating}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h4 className={`font-medium ${task.completada ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.titol}
                                {task.obligatoria && <span className="ml-2 text-xs text-red-600 font-bold">*</span>}
                            </h4>
                            {task.descripcio && <p className="text-sm text-gray-600 mt-1">{task.descripcio}</p>}
                            <div className="flex items-center gap-2 mt-2">
                                {showPhaseLabel && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{task.fase_associada}</span>}
                                <span className={`text-xs px-2 py-0.5 rounded ${getImportanceBadge(task.importancia)}`}>{task.importancia}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Manual</span>
                            </div>
                        </div>
                        {isEditable && (
                            <div className="flex gap-1">
                                <button onClick={() => handleEditTask(task)} className="text-blue-500 hover:text-blue-700 p-1" title="Editar tasca">
                                    <span className="material-icons-outlined text-sm">edit</span>
                                </button>
                                <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 p-1" title="Eliminar tasca">
                                    <span className="material-icons-outlined text-sm">delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderSystemTask = (config: SystemTaskConfig, showPhaseLabel = false) => {
        const isCompleted = !!bolo[config.field];
        return (
            <div
                key={config.field}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${isCompleted
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
            >
                <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleSystemTask(config.field, isCompleted)}
                    disabled={!isEditable || updating}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${isCompleted ? 'text-blue-900' : 'text-gray-900'}`}>{config.label}</h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Sistema</span>
                        {showPhaseLabel && <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">{config.fase}</span>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined">task_alt</span>
                        Tasques de "{faseActual}"
                    </h3>
                    {isEditable && (
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setNewTask({ titol: '', descripcio: '', importancia: 'mitjana', obligatoria: false });
                                setShowAddTaskModal(true);
                            }}
                            className="text-sm bg-primary hover:bg-red-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                            <span className="material-icons-outlined text-sm">add</span>
                            Afegir tasca
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {manualTasksForPhase.length === 0 && systemTasksForPhase.length === 0 ? (
                        <p className="text-gray-500 text-sm italic">No hi ha tasques per aquesta fase.</p>
                    ) : (
                        <>
                            {systemTasksForPhase.map(st => renderSystemTask(st))}
                            {manualTasksForPhase
                                .sort((a, b) => a.ordre - b.ordre)
                                .map(task => renderManualTask(task))
                            }
                        </>
                    )}
                </div>
            </div>

            {(tasquesPendentsAltresFases.length > 0 || pendingSystemTasks.length > 0) && (
                <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="material-icons-outlined text-sm">pending_actions</span>
                        Tasques pendents d'altres fases
                    </h3>
                    <div className="space-y-2 opacity-80">
                        {pendingSystemTasks.map(st => renderSystemTask(st, true))}
                        {tasquesPendentsAltresFases
                            .sort((a, b) => {
                                return (faseOrder[a.fase_associada] || 0) - (faseOrder[b.fase_associada] || 0);
                            })
                            .map(task => renderManualTask(task, true))}
                    </div>
                </div>
            )}

            {showAddTaskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">{editingTask ? 'Editar tasca' : 'Nova tasca'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Títol *
                                </label>
                                <input
                                    type="text"
                                    value={newTask.titol}
                                    onChange={(e) => setNewTask({ ...newTask, titol: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Ex: Confirmar transport"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripció
                                </label>
                                <textarea
                                    value={newTask.descripcio}
                                    onChange={(e) => setNewTask({ ...newTask, descripcio: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    rows={3}
                                    placeholder="Detalls opcionals..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Importància
                                </label>
                                <select
                                    value={newTask.importancia}
                                    onChange={(e) => setNewTask({ ...newTask, importancia: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="baixa">Baixa</option>
                                    <option value="mitjana">Mitjana</option>
                                    <option value="alta">Alta</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="obligatoria"
                                    checked={newTask.obligatoria}
                                    onChange={(e) => setNewTask({ ...newTask, obligatoria: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="obligatoria" className="text-sm text-gray-700">
                                    Tasca obligatòria per avançar de fase
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddTaskModal(false);
                                    setEditingTask(null);
                                    setNewTask({ titol: '', descripcio: '', importancia: 'mitjana', obligatoria: false });
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel·lar
                            </button>
                            <button
                                onClick={handleSaveTask}
                                disabled={!newTask.titol.trim() || updating}
                                className="px-4 py-2 bg-primary hover:bg-red-900 text-white rounded-lg disabled:opacity-50"
                            >
                                {editingTask ? 'Guardar canvis' : 'Afegir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
