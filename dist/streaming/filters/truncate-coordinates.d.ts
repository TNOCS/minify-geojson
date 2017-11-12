/// <reference types="node" />
import * as stream from 'stream';
import { Feature, DirectGeometryObject } from 'geojson';
export declare class TruncateCoordinates extends stream.Transform {
    private truncValue;
    constructor(truncValue: number);
    _transform(geojson: Feature<DirectGeometryObject>, encoding: string, done: (err, data) => void): void;
}
