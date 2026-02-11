'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { InventoryCatalogItem, InventoryStock, InventoryItem } from '@/types/clothing';

interface InventoryManagerProps {
    catalog: InventoryCatalogItem[];
    stock: InventoryStock[];
    items: InventoryItem[];
    onUpdate: () => void;
}

export default function InventoryManager({ catalog, stock, items, onUpdate }: InventoryManagerProps) {
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState<'stock' | 'items'>('stock');

    // Quick Add States
    const [isAddingStock, setIsAddingStock] = useState(false);
    const [newStockCatalogId, setNewStockCatalogId] = useState('');
    const [newStockSize, setNewStockSize] = useState('');
    const [newStockQty, setNewStockQty] = useState(0);

    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemCatalogId, setNewItemCatalogId] = useState('');
    const [newItemIdentifier, setNewItemIdentifier] = useState('');

    // Edit States
    const [editingStockId, setEditingStockId] = useState<string | null>(null);
    const [editStockQty, setEditStockQty] = useState(0);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editItemIdentifier, setEditItemIdentifier] = useState('');

    const handleAddStock = async () => {
        if (!newStockCatalogId || !newStockSize) return;

        const { error } = await supabase.from('inventory_stock').insert({
            catalog_id: newStockCatalogId,
            size: newStockSize,
            quantity_total: newStockQty
        });

        if (error) {
            alert('Error afegint estoc: ' + error.message);
        } else {
            setIsAddingStock(false);
            setNewStockCatalogId('');
            setNewStockSize('');
            setNewStockQty(0);
            onUpdate();
        }
    };

    const handleUpdateStock = async (id: string) => {
        const { error } = await supabase.from('inventory_stock').update({
            quantity_total: editStockQty
        }).eq('id', id);

        if (error) {
            alert('Error actualitzant estoc: ' + error.message);
        } else {
            setEditingStockId(null);
            onUpdate();
        }
    };

    const handleDeleteStock = async (id: string) => {
        if (!confirm('Eliminar aquest estoc?')) return;
        const { error } = await supabase.from('inventory_stock').delete().eq('id', id);
        if (error) {
            alert('Error eliminant estoc: ' + error.message);
        } else {
            onUpdate();
        }
    };

    const handleAddItem = async () => {
        if (!newItemCatalogId || !newItemIdentifier) return;

        const { error } = await supabase.from('inventory_items').insert({
            catalog_id: newItemCatalogId,
            identifier: newItemIdentifier,
            status: 'disponible'
        });

        if (error) {
            alert('Error afegint ítem: ' + error.message);
        } else {
            setIsAddingItem(false);
            setNewItemCatalogId('');
            setNewItemIdentifier('');
            onUpdate();
        }
    };

    const handleUpdateItem = async (id: string) => {
        const { error } = await supabase.from('inventory_items').update({
            identifier: editItemIdentifier
        }).eq('id', id);

        if (error) {
            alert('Error actualitzant ítem: ' + error.message);
        } else {
            setEditingItemId(null);
            onUpdate();
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm('Eliminar aquest ítem?')) return;
        const { error } = await supabase.from('inventory_items').delete().eq('id', id);
        if (error) {
            alert('Error eliminant ítem: ' + error.message);
        } else {
            onUpdate();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-border pb-2">
                <button
                    onClick={() => setActiveTab('stock')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors ${activeTab === 'stock' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Estoc de Roba (Quantitats)
                </button>
                <button
                    onClick={() => setActiveTab('items')}
                    className={`pb-2 px-2 text-sm font-medium transition-colors ${activeTab === 'items' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Items Individuals (Llibrets)
                </button>
            </div>

            {activeTab === 'stock' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsAddingStock(!isAddingStock)}
                            className="bg-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                            <span className="material-icons-outlined">add</span>
                            Afegir Estoc
                        </button>
                    </div>

                    {isAddingStock && (
                        <div className="bg-card-bg p-4 rounded-lg border border-border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs mb-1">Tipus</label>
                                <select
                                    className="w-full bg-background border border-border rounded p-2 text-sm"
                                    value={newStockCatalogId}
                                    onChange={(e) => setNewStockCatalogId(e.target.value)}
                                >
                                    <option value="">Selecciona...</option>
                                    {catalog.filter(c => c.type !== 'llibret').map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs mb-1">Talla</label>
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded p-2 text-sm"
                                    placeholder="ex. L, XL"
                                    value={newStockSize}
                                    onChange={e => setNewStockSize(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1">Quantitat Total</label>
                                <input
                                    type="number"
                                    className="w-full bg-background border border-border rounded p-2 text-sm"
                                    value={newStockQty}
                                    onChange={e => setNewStockQty(parseInt(e.target.value))}
                                />
                            </div>
                            <button
                                onClick={handleAddStock}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                            >
                                Guardar
                            </button>
                        </div>
                    )}

                    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-background/50 text-text-secondary font-medium">
                                <tr>
                                    <th className="px-4 py-3">Tipus</th>
                                    <th className="px-4 py-3">Talla</th>
                                    <th className="px-4 py-3">Quantitat Total</th>
                                    <th className="px-4 py-3 text-right">Accions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {stock.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">No hi ha estoc definit.</td></tr>
                                ) : (
                                    stock.map(s => (
                                        <tr key={s.id} className="hover:bg-hover-bg">
                                            <td className="px-4 py-3">{s.catalog?.name}</td>
                                            <td className="px-4 py-3 font-mono">{s.size}</td>
                                            <td className="px-4 py-3">
                                                {editingStockId === s.id ? (
                                                    <input
                                                        type="number"
                                                        value={editStockQty}
                                                        onChange={(e) => setEditStockQty(parseInt(e.target.value))}
                                                        className="w-20 px-2 py-1 bg-background border border-border rounded text-sm"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    s.quantity_total
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {editingStockId === s.id ? (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => handleUpdateStock(s.id)}
                                                            className="text-green-600 hover:text-green-700 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">check</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingStockId(null)}
                                                            className="text-red-600 hover:text-red-700 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setEditingStockId(s.id);
                                                                setEditStockQty(s.quantity_total);
                                                            }}
                                                            className="text-text-secondary hover:text-primary p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStock(s.id)}
                                                            className="text-text-secondary hover:text-red-600 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setIsAddingItem(!isAddingItem)}
                            className="bg-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                            <span className="material-icons-outlined">add</span>
                            Afegir Item Individual
                        </button>
                    </div>

                    {isAddingItem && (
                        <div className="bg-card-bg p-4 rounded-lg border border-border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-xs mb-1">Tipus</label>
                                <select
                                    className="w-full bg-background border border-border rounded p-2 text-sm"
                                    value={newItemCatalogId}
                                    onChange={(e) => setNewItemCatalogId(e.target.value)}
                                >
                                    <option value="">Selecciona...</option>
                                    {catalog.filter(c => c.type === 'llibret' || c.type === 'altre').map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs mb-1">Identificador / Nom</label>
                                <input
                                    type="text"
                                    className="w-full bg-background border border-border rounded p-2 text-sm"
                                    placeholder="ex. Llibret Trompeta 1"
                                    value={newItemIdentifier}
                                    onChange={e => setNewItemIdentifier(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleAddItem}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                            >
                                Guardar
                            </button>
                        </div>
                    )}

                    <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-background/50 text-text-secondary font-medium">
                                <tr>
                                    <th className="px-4 py-3">Identificador</th>
                                    <th className="px-4 py-3">Tipus</th>
                                    <th className="px-4 py-3">Estat</th>
                                    <th className="px-4 py-3 text-right">Accions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {items.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">No hi ha items individuals.</td></tr>
                                ) : (
                                    items.map(i => (
                                        <tr key={i.id} className="hover:bg-hover-bg">
                                            <td className="px-4 py-3 font-medium">
                                                {editingItemId === i.id ? (
                                                    <input
                                                        type="text"
                                                        value={editItemIdentifier}
                                                        onChange={(e) => setEditItemIdentifier(e.target.value)}
                                                        className="w-full px-2 py-1 bg-background border border-border rounded text-sm"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    i.identifier
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary">{i.catalog?.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs ${i.status === 'disponible' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                                                    {i.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {editingItemId === i.id ? (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => handleUpdateItem(i.id)}
                                                            className="text-green-600 hover:text-green-700 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">check</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingItemId(null)}
                                                            className="text-red-600 hover:text-red-700 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">close</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 justify-end">
                                                        <button
                                                            onClick={() => {
                                                                setEditingItemId(i.id);
                                                                setEditItemIdentifier(i.identifier);
                                                            }}
                                                            className="text-text-secondary hover:text-primary p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(i.id)}
                                                            className="text-text-secondary hover:text-red-600 p-1"
                                                        >
                                                            <span className="material-icons-outlined text-sm">delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
