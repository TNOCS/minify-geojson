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
    private loadFile(inputFile, options, cb);
    private processGeoJSON(geojson, inputFile, outputFile, options, done);
    private getCoordinateReferenceSystem(crsName, cb);
    private minifyPropertyKeys(props);
    private smartKey(key);
    private prune(props, blacklist, whitelist);
    private convertToNumberingScheme(counter);
}
