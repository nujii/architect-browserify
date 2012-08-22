
module.exports = function (options, imports, register) {

  var middleware = require('./middleware');
  var browserify = require('browserify');
  var uglifyjs = require("uglify-js"),
                parser = uglifyjs.parser,
                uglify = uglifyjs.uglify;

  options.imports = options.imports || [];

  var compile = function (path) {
    var bundle = browserify({
      entry: path,
      debug: !!options.debug,
      filter: function(code) {
        if(!!options.compress) {
          var ast = parser.parse(code);
          ast = uglify.ast_mangle(ast);
          ast = uglify.ast_squeeze(ast);
          return uglify.gen_code(ast);
        }
        else {
          return code;
        }
      }
    });

    if (options.imports) {
      for (var i = options.imports.length - 1; i >= 0; i--) {
        var importPath = options.imports[i]
        bundle.require(importPath);
      };
    }
    imports.logger.debug('Javascript compiled at '+path);
    return bundle;
  };

  imports.express.use(middleware({
      src: options.src,
      dest: options.dest,
      compile: compile
  }));

  imports.logger.debug('browserify ready to compile');

  register(null, {});
};
