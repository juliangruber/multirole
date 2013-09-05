/**
 * Module dependencies.
 */

var engine = require('engine.io-stream');
var multilevel = require('multilevel');

var db = multilevel.client();

var con = engine('/engine');
con.pipe(db.createRpcStream()).pipe(con);

window.db = db;
