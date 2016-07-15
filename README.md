# minify-geojson
A small tool to minify (compress) a GeoJSON file by:
- Removing non-significant whitespace
- Reducing the number of decimals used for coordinates: option `-c 5` to keep 5 decimals
- Minify the length of the keys by mapping each key name to a single of double letter combination: option `-k` converts long property keys such as `my_long_property_name` to `a` or `ab`. **Warning:** If you already have property keys like `a` or `b`, it may map them to the wrong name.
- Blacklist keys, i.e. remove these keys from the output
- Whitelist keys, i.e. only keep these keys in the output

# Installation
```shell
npm i -g minify-geojson
```

# Manual

```shell
Minify GeoJSON

  For each input file, minify (compress) a GeoJSON by replacing the attribute
  keys with a shorter representation (typically, its first letter). You can
  also reduce the number of decimals for coordinates, and whitelist and
  blacklist certain properties..

Options

  -k, --keys Boolean                  Minify property keys, e.g. id remains id, telephone becomes t, address a etc.
  -i, --includeKeyMap Boolean         Add the key map to the GeoJSON file. Requires the -k flag too.
  -b, --blacklist String              Comma separated list of properties that should be removed (others will be
                                      kept). Note that keys will not be minified unless the -k flag is used too.
  -w, --whitelist String              Comma separated list of properties that should be kept (others will be
                                      removed). Note that keys will not be minified unless the -k flag is used too.
  -c, --coordinates Positive number   Only keep the first n digits of each coordinate.
  -s, --src File names                Source files to process: you do not need to supply the -s flag.
  -v, --verbose Boolean               Output is verbose.
  
Examples

  1. Shrink property keys and output to original.min.geojson   $ minify-geojson -k original.geojson
  2. A verbose version                                         $ minify-geojson -kv original.geojson
  3. Prune the blacklisted properties                          $ minify-geojson -b "property1, property2" original.geojson
  4. Keep the whitelisted properties                           $ minify-geojson -w "property1, property2" original.geojson
  5. Removes superfluous decimals (keep first 5)               $ minify-geojson -c 5 original.geojson
  6. Add the key mapping to the output                         $ minify-geojson -ki original.geojson
  7. Full example                                              $ minify-geojson -kiv -w "property1, property2" -c 5 original.geojson                
  ```
