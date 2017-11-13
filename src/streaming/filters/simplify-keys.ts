import * as stream from 'stream';

/**
 * Simplify the keys, e.g. long_name => l. Only 'id' is spared from truncation.
 */
export class SimplifyKeys extends stream.Transform {
  private keys: { [key: string]: string } = {}; // original key to new key
  private reversedKeys: { [key: string]: string } = {}; // new key to original key
  private lastKey = 1;

  constructor() {
    super({ objectMode: true });
  }

  public get keyMap() { return { map: this.reversedKeys }; }

  public _transform(geojson: GeoJSON.Feature<GeoJSON.GeometryObject>, encoding: string, done: (err?, data?) => void) {
    geojson.properties = this.minifyPropertyKeys(geojson.properties);
    done(null, geojson);
  }

  public _flush(done: (err, data) => void) {
    console.log('Key map:');
    console.log(JSON.stringify(this.reversedKeys, null, 2));
    done(null, null);
  }

  /**
   * Minifies the property keys.
   *
   * @param {{ [key: string]: any }} props
   * @returns
   */
  private minifyPropertyKeys(props: { [key: string]: any }) {
    const newProps: { [key: string]: any } = {};
    for (const key in props) {
      let replace: string;
      if (this.keys.hasOwnProperty(key)) {
        replace = this.keys[key];
      } else {
        replace = this.smartKey(key);
        if (!replace) {
          do {
            replace = this.convertToNumberingScheme(this.lastKey++);
          } while (this.reversedKeys.hasOwnProperty(replace));
        }
        this.keys[key] = replace;
        this.reversedKeys[replace] = key;
      }
      newProps[replace] = props[key];
    }
    return newProps;
  }

  /**
   * Try to find an intelligent match, i.e. id remains, otherwise, try to use the first letter of the word.
   *
   * @param {string} key
   * @returns
   */
  private smartKey(key: string) {
    const id = 'id';
    key = key.toLowerCase();
    if (key === id) {
      // Case 1: check for an id
      if (!this.reversedKeys.hasOwnProperty(id)) { return id; }
    }
    // Case 2: can we use the first letter (ignoring white space)
    const replace = key.trim()[0];
    return this.reversedKeys.hasOwnProperty(replace) ? undefined : replace;
  }

  private convertToNumberingScheme(counter: number) {
    const baseChar = ('a').charCodeAt(0);
    let letters = '';

    do {
      counter -= 1;
      letters = String.fromCharCode(baseChar + (counter % 26)) + letters;
      counter = (counter / 26) >> 0;
    } while (counter > 0);

    return letters;
  }
}

