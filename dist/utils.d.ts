export declare const reportLog: (logger: (message?: any, ...optionalParams: any[]) => void, inputFile: string, outputFile: string, keys?: {
    [key: string]: string;
}, count?: number) => void;
export declare type FilterOperatorType = '=' | '<' | '>' | '<=' | '>=' | '!=';
export declare const createPropertyFilter: (prop: string, op: FilterOperatorType, val: string | number) => (props: Object) => boolean;
export declare const convertQueryToPropertyFilters: (filterQuery: string) => ((props: Object) => boolean)[];
