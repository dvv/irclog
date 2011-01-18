#!/usr/bin/env coffee
'use strict'

require.paths.unshift __dirname + '/lib/node'

# read configuration
config = require './config.coffee'

# connect to mongodb
db = new (require('mongo').Database) config.db.url or config.db.name
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
			config.irc.channels.forEach (channel) =>
				@write 'JOIN ' + channel + '\n'
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

# run HTTP server
server = require('http').createServer()

# setup static file server, if any
staticFileServer = new (require('static/node-static').Server) 'public', cache: 3600
server.on 'request', (req, res) ->
	# serve static files, or invoke dynamic handler
	if req.method is 'GET'
		staticFileServer.serve req, res, (err, data) ->
			serve req, res if err?.status is 404
	# other methods are noop, so far
	else
		res.writeHead 405
		res.end()

sys = require 'util'
parseUrl = require('url').parse
serve = (req, res) ->
	url = parseUrl req.url, true
	console.log 'REQ', sys.inspect url
	search = {}
	meta =
		skip: str2num url.query.skip, 0
		limit: str2num url.query.limit, 100, 100
	channel = url.pathname.substring(1).split('/')[0]
	if channel and channel isnt 'all'
		search.channel = '#'+channel
	if url.query.q
		re = glob2re '*' + url.query.q + '*'
		search.$or = [
			{author: re}
			{text: re}
		]
	console.log 'QUERY', sys.inspect(search), sys.inspect(meta)
	db.find config.db.table, search, meta, (err, docs) ->
		#console.log 'FOUND', err, docs
		if err
			res.writeHead 403, 'content-type': 'text/plain'
			res.end err.message or err
		else
			res.writeHead 200, 'content-type': 'application/json'
			docs.forEach (doc) ->
				doc.id = doc._id
				delete doc._id
			res.end JSON.stringify docs

server.listen 8000
console.log "HTTP server running at http://*:8000/. Use CTRL+C to stop."

str2num = (x, default, max) ->
	x = +x
	x = x is x and x or default
	if max? and x > max
		x = max
	x

glob2re = (x) ->
	s = decodeURIComponent(x).replace(/([\\|\||\(|\)|\[|\{|\^|\$|\*|\+|\?|\.|\<|\>])/g, (x) -> '\\'+x).replace(/\\\*/g,'.*').replace(/\\\?/g,'.?')
	s = if s.substring(0,2) isnt '.*' then '^'+s else s.substring(2)
	s = if s.substring(s.length-2) isnt '.*' then s+'$' else s.substring(0, s.length-2)
	new RegExp s, 'i'
