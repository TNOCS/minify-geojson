export interface ITopologyOptions {
    /**
     * Informational messages will be output to stderr
     * 
     * @type {boolean}
     */
    verbose?: boolean,
    /**
     * Either "cartesian", "spherical" or null to infer the coordinate system automatically
     * 
     * @type {("cartesian" | "spherical" | "")}
     */
    "coordinate-system"?: "cartesian" | "spherical" | "",
    /**
     * If truthy and using spherical coordinates, polar antimeridian cuts will be stitched 
     * 
     * @type {boolean}
     */
    "stitch-poles"?: boolean,
    /**
     * Quantization precision; the maximum number of differentiable points per dimension. 
     * 
     * @type {number}
     */
    quantization?: number,
    /**
     * A function for computing the id of each input feature. 
     * 
     * @type {Function}
     */
    id?: Function,
    /**
     * A function for remapping properties.
     * 
     * @type {Function}
     */
    "property-transform"?: Function
}

export interface ITopology {
}

export interface ITopoJSON {
    /**
     * Convert to TopoJSON 
     * 
     * @param {{ collection: GeoJSON.FeatureCollection<GeoJSON.GeometryObject> }} collection
     */
    topology(collection: { collection: GeoJSON.FeatureCollection<GeoJSON.GeometryObject> }, options?: ITopologyOptions): ITopology;
    /**
     * Simplifies the topology.
     * 
     * @param {ITopology} topo
     * @param {{ verbose: boolean }} [options]
     * @returns {ITopology}
     */
    simplify(topo: ITopology, options?: { verbose?: boolean, "coordinate-system": string }): ITopology;
    /**
     * Removes any unused arcs from the specified topology.
     * 
     * @param {ITopology} topo
     * @param {{ verbose: boolean }} [options]
     * @returns {ITopology}
     */
    prune(topo: ITopology, options?: { verbose: boolean }): ITopology;
    filter(topo: ITopology, options?: { verbose: boolean }): ITopology;
    clockwise(topo: ITopology, options?: { verbose: boolean }): ITopology;
}
