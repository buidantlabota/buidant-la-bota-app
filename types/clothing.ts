export type CatalogType = 'samarreta' | 'dessuadora' | 'llibret' | 'altre';

export interface InventoryCatalogItem {
    id: string;
    name: string;
    type: CatalogType;
}

export interface InventoryStock {
    id: string;
    catalog_id: string;
    size: string;
    quantity_total: number;
    catalog?: InventoryCatalogItem;
}

export interface InventoryItem {
    id: string;
    catalog_id: string;
    identifier: string; // e.g. "Trompeta #1"
    status: 'disponible' | 'prestat' | 'retirat' | 'reparacio';
    notes?: string;
    catalog?: InventoryCatalogItem;
}

export interface MaterialLoan {
    id: string;
    bolo_id?: string;
    suplent_id: string;
    item_type: CatalogType;
    stock_id?: string;
    item_id?: string;
    loan_date: string;
    return_date_expected?: string;
    return_date_real?: string;
    status: 'prestat' | 'retornat' | 'perdut';
    notes?: string;

    // Joins
    bolo?: { nom_poble: string; data_bolo: string };
    suplent?: { nom: string; tipus?: string };
    stock?: InventoryStock;
    item?: InventoryItem;
    catalog_name?: string; // Helper for display
    size_name?: string;    // Helper for display
}
