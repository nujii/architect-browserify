# architect-browseriy

[browserify](https://github.com/substack/node-browserify) plugin for 
[architect](https://github.com/c9/architect)

## Config Format

```js
{
  "packagePath": "./node_modules/architect-browserify",
  "src": __dirname+"/assets",
  "dest": __dirname+"/target",
  // Compress the output using uglify-js
  "compress": true,
  // Forces recompilation for every request
  "force": true
}
```

## Usage

Now we mount /target as a static path and we can access our
javascripts at `http://0.0.0.0:{port}/{jsFolder}/{file.js}`
and it will be compiled on the fly

## TODO

- Provide some tests
