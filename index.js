/**
 * 1) HTTP server with level integration
 * 2) put db and main into roles
 * 3) connect via multilevel
 * 4) deploy as 2 or 1 and kill
 * 5) browserify
 * 6) websockets (2nd level)
 * 7) uppercaser (number crunching)
 */

/**
 * Module dependencies.
 */

var http = require('http');
var level = require('level');
var concat = require('concat-stream');
var role = require('role');
var multilevel = require('multilevel');
var Engine = require('engine.io-stream');
var fs = require('fs');
var Transform = require('stream').Transform;

role('db', function() {
  var db = level(__dirname + '/db');
  return function() {
    return multilevel.server(db);
  }
});

role('uppercaser', function() {
  return function() {
    var tr = Transform({ objectMode: true });
    tr._transform = function(chunk, enc, done) {
      done(null, chunk.toString().toUpperCase());
    };
    return tr;
  }
});

role('main', function() {
  var db = multilevel.client();

  role.subscribe('db', function(con) {
    con.pipe(db.createRpcStream()).pipe(con);
  });

  var server = http.createServer(function(req, res) {
    if (req.url == '/')
      return res.end('<script src="/bundle.js"></script>');
    else if (req.url == '/bundle.js')
      return fs.createReadStream(__dirname + '/bundle.js').pipe(res);

    var key = req.url.slice(1);

    if (req.method == 'GET') {

      db.get(key, function(err, value) {
        res.end(value);
      });

    } else {

      req.setEncoding('utf8');
      req
      .pipe(role.get('uppercaser'))
      .pipe(concat(function(value) {
        db.put(key, value, function(err) {
          res.end('ok');
        });
      }));

    }
  });

  var engine = Engine(function(con) {
    con.pipe(multilevel.server(db)).pipe(con);
  });
  engine.attach(server, '/engine');

  server.listen(8000);
});

