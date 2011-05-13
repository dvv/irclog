'use strict';

var Path = require('path');
var Url = require('url');
var Fs = require('fs');
var Ws = require('wscomm');

var config = require('./config');

//
// simple nonce generator
//
function rnd() {
	return Math.floor(Math.random() * 1e9).toString(36);
}
function nonce() {
	return (Date.now() & 0x7fff).toString(36) + rnd() + rnd() + rnd();
}

//
// start redis
//
var db;
require('nedis').createServer().listen().on('listening', function() {
	console.log('LISTENS');
	db = require('redis').createClient();
});

//
// IRC bot: dump posts to specified channels to db, publishing to websocket
//
var buf = '';
var re = /:(\w+)![^\s]+ PRIVMSG (#[\w\.]+) :(.*)/;
var conn = require('net').createConnection(config.irc.port, config.irc.host);
conn.on('data', function(data) {
	buf += data;
	var lines = buf.split('\n');
	while (lines.length > 1) {
		var line = lines.shift();
		//console.log('LINE', line);
		if (line.indexOf('\*\*\* No Ident response') >= 0) {
			this.write('NICK ' + config.irc.nick + '\n');
			if (config.irc.password) {
				this.write('PASS ' + config.irc.password + '\n');
			}
			this.write('USER ' + config.irc.nick + ' foo bar :Logger\n');
			config.irc.channels.forEach(function(channel) {
				return this.write('JOIN ' + channel + '\n');
			}.bind(this));
		} else if (line.indexOf('PING :') === 0) {
			this.write(line.replace(/^PING/, 'PONG') + '\n');
		} else {
			line.replace(re, function(string, author, channel, text) {
				var date = new Date();
				if (config.print) {
					console.log(date + '\t' + author + '\t' + channel + '\t' + text);
				}
				// the post
				var id = nonce();
				var post = {
					date: date,
					channel: channel,
					author: author,
					text: text
				};
				// save to db
				var pid = 'p:' + id;
				db.set(pid, JSON.stringify(post));
				db.zadd('timeline', +date, pid);
				db.rpush('a:' + author, pid);
				db.rpush('c:' + channel, pid);
				// push to websocket
				ws.invoke(null, 'post', post);
			});
		}
	}
	buf = lines[0];
});

//
// setup middleware
//
function middleware(req, res) {
	req.url = Path.normalize(req.url);
	if (req.url === '/') req.url = '/index.html';
	Fs.readFile(__dirname + req.url, 'utf8', function(err, text) {
		if (err) {
			req.uri = Url.parse(req.url);
			fetch(req.uri.query, function(err, result) {
				res.writeHead(200);
				res.end(JSON.stringify(result));
			});
		} else {
			var mime = req.url.slice(-3) === '.js' ? 'text/javascript' : 'text/html';
			res.writeHead(200, {'content-type': mime});
			res.end(text);
		}
	});
}

//
// run HTTP server
//
var http = require('http').createServer();
http.on('request', middleware);
http.listen(3000);

//
// attach websocket logic
//
var ws = Ws.listen(http, {
	ready: function() {
		this.context.extend({
			query: function(next, query) {
				fetch(query, next);
			}
		});
	}
});
