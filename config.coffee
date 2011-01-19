module.exports =
	debug: true
	server:
		port: 3000
		workers: 0
		uid: 65534
		repl: true
		static:
			dir: 'public'
			ttl: 3600
		#websocket: true
	security:
		#bypass: true
		secret: 'change-me-on-production-server'
	database:
		url: 'mongodb://127.0.0.1/irc'
		table: 'irc'
	irc:
		nick: 'sucaba-' + (''+Math.random()).substr(2, 3)
		'//password': 'ddddd'
		channels: [
			#'#documentcloud'
			#'#persevere'
			'#persevere1234'
			#'#openlgtv'
			#'#Node.js'
		]
		host: 'irc.freenode.net'
		port: 6667
	print: true # dump formatted lines to stdout?
