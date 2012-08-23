// Shamelessly copied from the stylus middleware

var imports = {};

module.exports = function(options){
  var browserify = require('browserify');
  var mkdirp = require('mkdirp');
  var join = require('path').join;
  var dirname = require('path').dirname;
  var url = require('url');
  var fs = require('fs');
  options = options || {};

  // Accept src/dest dir
  if ('string' == typeof options) {
    options = { src: options };
  }

  // Force compilation
  var force = options.force;

  // Source dir required
  var src = options.src;
  if (!src) throw new Error('browserify.middleware() requires "src" directory');

  // Default dest dir to source
  var dest = options.dest
    ? options.dest
    : src;

  // Default compile callback
  options.compile = options.compile || function(path){
    return browserify({
      entry: path
    });
  };

  // Middleware
  return function browserify(req, res, next){
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var path = url.parse(req.url).pathname;
    if (/\.js$/.test(path)) {
      var jsPath = join(dest, path)
        , coffeePath = join(src, path.replace('.js', '.coffee'))
        , origPath = join(src, path);

      // Ignore ENOENT to fall through as 404
      function error(err) {
        next('ENOENT' == err.code
          ? null
          : err);
      }

      // Force
      if (force) return compile();

      // Compile to jsPath
      function compile() {

        fs.exists(coffeePath, function(isCoffee){
          if (!isCoffee) {
            fs.exists(origPath, function(exists) {
              if (!exists) {
                next();
              }
              else {
                commonCompile(origPath);
              }
            });
          }
          else {
            commonCompile(coffeePath);
          }
        });
      }

      function commonCompile(path) {
        var compiler = options.compile(path);
        delete imports[path];
        var js = compiler.bundle();
        mkdirp(dirname(jsPath), 0700, function(err){
          if (err) return error(err);
          fs.writeFile(jsPath, js, 'utf8', next);
        });
      };

      // Re-compile on server restart, disregarding
      // mtimes since we need to map imports
      if (!imports[origPath] && !imports[coffeePath]) return compile();

      // Compare mtimes
      fs.stat(coffeePath, function(err, coffeeStats){
        fs.stat(origPath, function(err, origStats){
          if (err) return error(err);
          commonCompare(origPath, origStats);
        });
        commonCompare(coffeePath, coffeeStats);
      });

      function commonCompare(path, stats) {
        fs.stat(jsPath, function(err, jsStats){
          // JS has not been compiled, compile it!
          if (err) {
            if ('ENOENT' == err.code) {
              compile();
            } else {
              next(err);
            }
          } else {
            console.log(stats);
            // Source has changed, compile it
            if (stats.mtime > jsStats.mtime) {
              compile();
              imports[path]=[{path:path,mtime:stats.mtime}];
            // Already compiled, check imports
            } else {
              checkImports(path, function(changed){
                changed && changed.length ? compile() : next();
              });
            }
          }
        });
      };
    } else {
      next();
    }
  }
};

/**
 * Check `path`'s imports to see if they have been altered.
 *
 * @param {String} path
 * @param {Function} fn
 * @api private
 */

function checkImports(path, fn) {
  var nodes = imports[path];
  if (!nodes) return fn();
  if (!nodes.length) return fn();

  var pending = nodes.length
    , changed = [];

  nodes.forEach(function(imported){
    fs.stat(imported.path, function(err, stat){
      // error or newer mtime
      if (err || !imported.mtime || stat.mtime > imported.mtime) {
        changed.push(imported.path);
      }
      --pending || fn(changed);
    });
  });
}