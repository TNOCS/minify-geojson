export interface ICommandOptions {
  /**
   * Minify property keys, e.g. id remains id, telephone becomes t, address a etc.
   *
   * @type {boolean}
   * @memberof ICommandOptions
   */
  keys: boolean;
  /**
   * Add the key map to the GeoJSON file. Requires the -k flag too.
   *
   * @type {boolean}
   * @memberof ICommandOptions
   */
  includeKeyMap: boolean;
  /**
   * Reproject to WGS84 by supplying the input EPSG coordinate system, e.g. -r EPSG:28992.
   *
   * @type {string}
   * @memberof ICommandOptions
   */
  reproject: string;
  /**
   * Comma separted list of property filters, e.g. "WATER = YES, LAND = NO".
   *
   * @type {string}
   * @memberof ICommandOptions
   */
  filter: string;
  /**
   * Output format is TopoJSON instead of GeoJSON.
   *
   * @type {boolean}
   * @memberof ICommandOptions
   */
  topo: boolean;
  /**
   *
   *
   * @type {boolean}
   * @memberof ICommandOptions
   */
  verbose: boolean;
  /**
   * Only keep the first n digits of each coordinate.
   *
   * @type {number}
   * @memberof ICommandOptions
   */
  coordinates: number;
  /**
   * Only keep the first n digits of each decimal property.
   *
   * @type {number}
   * @memberof ICommandOptions
   */
  decimals: number;
  /**
   * Source files to process: you do not need to supply the -s flag.
   *
   * @type {string[]}
   * @memberof ICommandOptions
   */
  src: string[];
  /**
   * Comma separated list of properties that should be kept (others will be removed).
   * Note that keys will not be minified unless the -k flag is used too.
   *
   * @type {string}
   * @memberof ICommandOptions
   */
  whitelist: string;
  /**
   * Comma separated list of properties that should be removed (others will be kept).
   * Note that keys will not be minified unless the -k flag is used too.
   *
   * @type {string}
   * @memberof ICommandOptions
   */
  blacklist: string;
}
