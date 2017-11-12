export interface ICommandOptions {
    keys: boolean;
    includeKeyMap: boolean;
    reproject: string;
    filter: string;
    topo: boolean;
    verbose: boolean;
    coordinates: number;
    decimals: number;
    src: string[];
    whitelist: string;
    blacklist: string;
}
