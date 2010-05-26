#!/usr/local/bin/node

var sys = require('sys'),
	net = require('net'),
	mongo = require('./mongodb');

var nick = 'ddddd';
var password;// = 'ddddd'; // leave undefined if no password
var channels = '#persevere';

var irchost = 'irc.freenode.net';
var ircport = 6667;

var dump = true; // dump to stdout?

var dbhost = '127.0.0.1';
var dbport = 27017;
var dbname = 'test';
var dbcoll = 'irc';

// connect to local mongo server
var db = new mongo.Db(dbname, new mongo.Server(dbhost, dbport, {}), {});
db.open(function(err, db){
	db.collection(dbcoll, function(err, collection){

// connect to IRC server
var buf = '';
net.createConnection(ircport, irchost)
	.addListener('connect', function(){
		//
	})
	.addListener('data', function(data){
		//sys.print(data);
		buf += data;
		var lines = buf.split('\n');
		while (lines.length > 1) {
			var line = lines.shift();
			if (line.indexOf('\*\*\* No Ident response') >= 0) {
				this.write('NICK ' + nick + '\n');
				if (password)
					this.write('PASS ' + password + '\n');
				this.write('USER ' + nick + ' foo bar :Logger\n');
				this.write('JOIN ' + channels + '\n');
			} else if (line.indexOf('PING :') == 0) {
				this.write(line.replace(/^PING/, 'PONG') + '\n');
			} else {
				// dump the line to DB
				line.replace(/:(\w+)![^\s]+ PRIVMSG (#\w+) :(.*)\r/, function(string, author, channel, text) {
					var date = new Date().toISOString();
					if (dump)
						sys.puts(date + '\t' + author + '\t' + channel + '\t' + text);
					collection.insert({date: date, channel: channel, author: author, text: text});
				});
			}
		}
		buf = lines[0];
	})
;

	});
});
