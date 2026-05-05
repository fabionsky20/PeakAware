/**
 * @file sentiero.model.ts
 * @description Modello per la rappresentazione di un sentiero.
 * D2 dove?
 */

export interface Sentiero {
    osm_id: string;
    isVisible: boolean;
    properties: {
        name?: string;
        ref?: string;
        difficulty?: string;
        description?: string;
        // Altri campi da OSM se necessario
    };
    geometry: any; // GeoJSON
}