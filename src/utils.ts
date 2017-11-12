import * as fs from 'fs';

export const reportLog = (logger: (message?: any, ...optionalParams: any[]) => void, inputFile: string, outputFile: string, keys?: { [key: string]: string }, count?: number) => {
  const inputFileSizeInBytes = fs.statSync(inputFile).size;
  const outputFileSizeInBytes = fs.statSync(outputFile).size;
  const percentage = 100 * (inputFileSizeInBytes - outputFileSizeInBytes) / inputFileSizeInBytes;
  logger(`\n${inputFile}${count ? ' with ' + count + ' features' : ''} minified successfully to ${outputFile}.\n`);
  if (keys) {
    logger('Key mapping:');
    logger(JSON.stringify(keys, null, 2) + '\n');
  }
  logger(`Original size :\t${inputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
  logger(`Minified size :\t${outputFileSizeInBytes.toLocaleString('en-US', { minimumFractionDigits: 0 })}`);
  logger(`Reduction :   \t${percentage.toLocaleString('en-US', { minimumFractionDigits: 2 })}%`);
};

export type FilterOperatorType = '=' | '<' | '>' | '<=' | '>=' | '!=';

/**
 * Create a GeoJSON property filter function.
 * Returns false when the property is not available, or when the criteria does not match.
 *
 * For example,
 *   waterFilter = createPropertyFilter('WATER', '=', 'YES')
 * Will return false for properties {}, { "WATER": "NO" } and true for { "WATER": "YES" }
 *
 * @param {string} prop
 * @param {string} op
 * @param {(string | number)} val
 * @returns
 */
export const createPropertyFilter = (prop: string, op: FilterOperatorType, val: string | number) => {
  switch (op) {
    // tslint:disable-next-line:triple-equals
    case '=': return (props: Object) => props.hasOwnProperty(prop) && props[prop] == val;
    case '<': return (props: Object) => props.hasOwnProperty(prop) && props[prop] < val;
    case '>': return (props: Object) => props.hasOwnProperty(prop) && props[prop] > val;
    case '<=': return (props: Object) => props.hasOwnProperty(prop) && props[prop] <= val;
    case '>=': return (props: Object) => props.hasOwnProperty(prop) && props[prop] >= val;
    // tslint:disable-next-line:triple-equals
    case '!=': return (props: Object) => props.hasOwnProperty(prop) && props[prop] != val;
    default: throw new Error(`Operator ${op} is not supported!`);
  }
};

/**
 * Convert a filter query to a list of property filters.
 *
 * @param {string} filterQuery
 */
export const convertQueryToPropertyFilters = (filterQuery: string): Array<(props: Object) => boolean> => {
  const re = /^([a-zA-Z_ 0-9]*) ?([!<>=]{1,2}) ?([a-zA-Z_ -0-9]*)$/;

  const queries = filterQuery.split(',').map(q => q.trim());
  const filters = [];
  queries.forEach(q => {
    const m = re.exec(q);
    if (!m || m.length !== 4) {
      const errMsg = 'Filters should be in the form PROPERTY OPERATOR VALUE, where property is a string, OPERATOR is <, =, >, !=, <= or >=, and VALUE is a string or number.';
      console.error(errMsg);
      throw new Error(errMsg);
    }
    filters.push(createPropertyFilter(m[1].trim(), m[2].trim() as FilterOperatorType, m[3].trim()));
  });
  return filters;
};
