#!/usr/bin/env coffee
'use strict';

require.paths.unshift __dirname + '/lib/node'

# read configuration
config = require './config.coffee'

# connect to mongodb
db = new (require('mongo').Database) config.db.url #name
# index db
db.index config.db.table, date: false, channel: false, author: false

# connect to IRC server
buf = ''
conn = require('net').createConnection config.irc.port, config.irc.host
#conn.on 'connect', ->
conn.on 'data', (data) ->
	#console.log ''+data
	buf += data
	lines = buf.split '\n'
	while lines.length > 1
		line = lines.shift()
		if line.indexOf('\*\*\* No Ident response') >= 0
			@write 'NICK ' + config.irc.nick + '\n'
			if config.irc.password
				@write 'PASS ' + config.irc.password + '\n'
			@write 'USER ' + config.irc.nick + ' foo bar :Logger\n'
			@write 'JOIN ' + config.irc.channels.join(' ') + '\n'
		else if line.indexOf('PING :') is 0
			@write line.replace(/^PING/, 'PONG') + '\n'
		else
			# dump the line to DB
			line.replace /:(\w+)![^\s]+ PRIVMSG (#\w+) :(.*)\r/, (string, author, channel, text) ->
				date = new Date().toISOString()
				if config.print
					console.log date + '\t' + author + '\t' + channel + '\t' + text
				db.insert config.db.table, {date: date, channel: channel, author: author, text: text} #, (err, doc) -> console.log 'INSERTED', err, doc
	buf = lines[0]
