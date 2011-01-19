#!/usr/bin/env coffee
'use strict'

require.paths.unshift __dirname + '/lib/node'

# read configuration
global.settings = require('./config')

# define model
run = require('simple').run
store = require 'simple/store'
Store = store.Store
Model = store.Model
Facet = store.Facet
RestrictiveFacet = store.RestrictiveFacet
PermissiveFacet = store.PermissiveFacet

schema = {}
model = {}
facets = {}

schema.log =
	type: 'object'
	properties:
		channel:
			type: 'string'
		author:
			type: 'string'
		date:
			type: 'date'
		text:
			type: 'string'

model.log = Model 'irc', Store('irc'), {
}

facets.log = RestrictiveFacet model.log,
	schema: schema.log

wait waitAllKeys(model), () ->
	# define the application
	app = Compose.create require('events').EventEmitter, {
		getSession: (req, res) ->
			Object.freeze
				context:
					log: facets.log
	}
	# run the application
	run app

# connect to mongodb
#db = new (require('mongo').Database) settings.database.url or settings.database.name
# index db
#db.index settings.database.table, date: false, channel: false, author: false

'''
# connect to IRC server
# TODO: proxy?!
buf = ''
conn = require('net').createConnection settings.irc.port, settings.irc.host
#conn.on 'connect', ->
conn.on 'data', (data) ->
	#console.log ''+data
	buf += data
	lines = buf.split '\n'
	while lines.length > 1
		line = lines.shift()
		if line.indexOf('\*\*\* No Ident response') >= 0
			@write 'NICK ' + settings.irc.nick + '\n'
			if settings.irc.password
				@write 'PASS ' + settings.irc.password + '\n'
			@write 'USER ' + settings.irc.nick + ' foo bar :Logger\n'
			settings.irc.channels.forEach (channel) =>
				@write 'JOIN ' + channel + '\n'
		else if line.indexOf('PING :') is 0
			@write line.replace(/^PING/, 'PONG') + '\n'
		else
			# dump the line to DB
			line.replace /:(\w+)![^\s]+ PRIVMSG (#[\w\.]+) :(.*)\r/, (string, author, channel, text) ->
				date = new Date().toISOString()
				if settings.print
					console.log date + '\t' + author + '\t' + channel + '\t' + text
				db.insert settings.database.table, {date: date, channel: channel, author: author, text: text} #, (err, doc) -> console.log 'INSERTED', err, doc
	buf = lines[0]
'''

'''
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
	# parse URL
	url = parseUrl req.url, true
	# TODO: decodeURIComponent to url.query!
	console.log 'REQ', sys.inspect url
	search = {}
	# p parameter is page number
	page = str2num url.query.p, 0
	pageSize = 100 # hardcoded. dot.
	meta =
		skip: page * pageSize
		limit: pageSize
	channel = url.pathname.substring(1).split('/')[0]
	# 'all' channel means no channel filter
	if channel and channel isnt 'all'
		search.channel = '#'+channel
	# q parameter is regexp to full-text search
	if url.query.q
		re = glob2re '*' + url.query.q + '*'
		search.$or = [
			{author: re}
			{text: re}
		]
	else
		meta.sort = date: -1
	# TODO: filter by date
	# TODO: /CHANNEL|all/bydate/DATE
	# TODO: /CHANNEL|all/byauthor/AUTHOR
	#console.log 'QUERY', sys.inspect(search), sys.inspect(meta)
	db.find settings.database.table, search, meta, (err, docs) ->
		#console.log 'FOUND', err, docs
		if err
			res.writeHead 403, 'content-type': 'text/plain'
			res.end err.message or err
		else
			res.writeHead 200, 'content-type': 'application/json; charset=utf-8'
			docs.forEach (doc) ->
				doc.id = doc._id
				delete doc._id
			str = JSON.stringify posts: docs, channels: settings.irc.channels
			res.end if url.query.callback then "#{url.query.callback}(#{str})" else str

server.listen 8000
console.log "HTTP server running at http://*:8000/. Use CTRL+C to stop."

str2num = (x, def, max) ->
	x = +x
	x = x is x and x or def
	if max? and x > max
		x = max
	x

glob2re = (x) ->
	s = decodeURIComponent(x).replace(/([\\|\||\(|\)|\[|\{|\^|\$|\*|\+|\?|\.|\<|\>])/g, (x) -> '\\'+x).replace(/\\\*/g,'.*').replace(/\\\?/g,'.?')
	s = if s.substring(0,2) isnt '.*' then '^'+s else s.substring(2)
	s = if s.substring(s.length-2) isnt '.*' then s+'$' else s.substring(0, s.length-2)
	new RegExp s, 'i'
'''
