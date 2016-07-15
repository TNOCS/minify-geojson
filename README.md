# minify-geojson
A small tool to minify (compress) a GeoJSON file by:
- Removing non-significant whitespace
- Reducing the number of decimals used for coordinates: option `-c 5` to keep 5 decimals
- Minify the length of the keys by mapping each key name to a single of double letter combination: option `-k` converts long property keys such as `my_long_property_name` to `a` or `ab`. **Warning:** If you already have property keys like `a` or `b`, it may map them to the wrong name.
