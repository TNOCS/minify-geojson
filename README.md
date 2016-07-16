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

  Minify (compress) each input GeoJSON or ESRI shape file by replacing the
  attribute keys with a shorter representation (typically, its first letter).
  You can also reduce the number of decimals for coordinates, whitelist and
  blacklist or filter certain properties. Output can be GeoJSON or TopoJSON. If
  you wish to reproject to WGS84, you can supply the EPSG code (which will be
  retreived via http://www.spatialreference.org/ref/epsg/YOURCODE/proj4/).

Options

  -k, --keys Boolean                  Minify property keys, e.g. id remains id, telephone becomes t, address a etc.
  -i, --includeKeyMap Boolean         Add the key map to the GeoJSON file. Requires the -k flag too.
  -t, --topo Boolean                  Output format is TopoJSON instead of GeoJSON.
  -r, --reproject String              Reproject to WGS84 by supplying the input EPSG coordinate system, e.g. -r
                                      EPSG:28992
  -f, --filter String                 Comma separted list of property filters, e.g. "WATER = YES, LAND = NO"
  -b, --blacklist String              Comma separated list of properties that should be removed (others will be
                                      kept). Note that keys will not be minified unless the -k flag is used too.
  -w, --whitelist String              Comma separated list of properties that should be kept (others will be
                                      removed). Note that keys will not be minified unless the -k flag is used too.
  -c, --coordinates Positive number   Only keep the first n digits of each coordinate.
  -s, --src File names                Source files to process: you do not need to supply the -s flag.
  -v, --verbose Boolean               Output is verbose.

Examples

  01. Shrink property keys and output to original.min.geojson   $ minify-geojson -k original.geojson
  02. A verbose version                                         $ minify-geojson -kv original.geojson
  03. Prune the blacklisted properties                          $ minify-geojson -b "property1, property2" original.geojson
  04. Keep the whitelisted properties                           $ minify-geojson -w "property1, property2" original.geojson
  05. Removes superfluous decimals (keep first 5)               $ minify-geojson -c 5 original.geojson
  06. Add the key mapping to the output                         $ minify-geojson -ki original.geojson
  07. Convert output to topojson (-i and -c are not used)       $ minify-geojson -kt original.geojson
  08. Reproject shape file in RD (EPSG:28992) to TopoJSON       $ minify-geojson -ktv -r 28992 original.shp
  09. Filter based on properties                                $ minify-geojson -ktv -r 28992 -f "WATER = NO, CITY=Amsterdam" -b "WATER, CITY" original.shp
  10. Full example                                              $ minify-geojson -ktiv -w "property1, property2" -c 5 original.geojson
```
