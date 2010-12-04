#!/usr/bin/env node

var fs = require('fs'),
	net = require('net'),
	mongo = require('mongodb');

// read configuration
var config = JSON.parse(fs.readFileSync('local.json', 'utf8'));

// connect to mongodb
var db = new mongo.Db(config.db.name, new mongo.Server(config.db.host, config.db.port, {}), {});
db.open(function(err, db){
	var table = config.db.table;
	db.collection(table, function(err, collection){
	// set indexes
	['date', 'channel', 'author'].forEach(function(prop){
		db.ensureIndex(table, prop, true, function(){});
	});

// connect to IRC server
var buf = '';
net.createConnection(config.irc.port, config.irc.host)
	.addListener('connect', function(){
		//
	})
	.addListener('data', function(data){
		//console.log(data);
		buf += data;
		var lines = buf.split('\n');
		while (lines.length > 1) {
			var line = lines.shift();
			if (line.indexOf('\*\*\* No Ident response') >= 0) {
				this.write('NICK ' + config.irc.nick + '\n');
				if (config.irc.password)
					this.write('PASS ' + config.irc.password + '\n');
				this.write('USER ' + config.irc.nick + ' foo bar :Logger\n');
				this.write('JOIN ' + config.irc.channels.join(' ') + '\n');
			} else if (line.indexOf('PING :') === 0) {
				this.write(line.replace(/^PING/, 'PONG') + '\n');
			} else {
				// dump the line to DB
				line.replace(/:(\w+)![^\s]+ PRIVMSG (#\w+) :(.*)\r/, function(string, author, channel, text) {
					var date = new Date().toISOString();
					if (config.print)
						console.log(date + '\t' + author + '\t' + channel + '\t' + text);
					collection.insert({date: date, channel: channel, author: author, text: text});
				});
			}
		}
		buf = lines[0];
	})
;

	});
});
