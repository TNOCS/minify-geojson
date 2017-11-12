export interface ITopologyOptions {
    verbose?: boolean;
    "coordinate-system"?: "cartesian" | "spherical" | "";
    "stitch-poles"?: boolean;
    quantization?: number;
    id?: Function;
    "property-transform"?: Function;
}
export interface ITopology {
}
export interface ITopoJSON {
    topology(collection: {
        collection: GeoJSON.FeatureCollection<GeoJSON.GeometryObject>;
    }, options?: ITopologyOptions): ITopology;
    simplify(topo: ITopology, options?: {
        verbose?: boolean;
        "coordinate-system": string;
    }): ITopology;
    prune(topo: ITopology, options?: {
        verbose: boolean;
    }): ITopology;
    filter(topo: ITopology, options?: {
        verbose: boolean;
    }): ITopology;
    clockwise(topo: ITopology, options?: {
        verbose: boolean;
    }): ITopology;
}
