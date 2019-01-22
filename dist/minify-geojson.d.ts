import { ICommandOptions } from './cli';
import { FeatureCollection, GeometryObject } from 'geojson';
export declare class MinifyGeoJSON {
    private options;
    private logger;
    private keys;
    private reversedKeys;
    private lastKey;
    constructor(options: ICommandOptions);
    filter(geojson: FeatureCollection<GeometryObject>, filterQuery: string): FeatureCollection<GeometryObject, any>;
    private loadFile;
    private processGeoJSON;
    private getCoordinateReferenceSystem;
    private minifyPropertyKeys;
    private smartKey;
    private prune;
    private convertToNumberingScheme;
}
