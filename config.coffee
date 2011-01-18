module.exports =
	irc:
		nick: 'sucaba-' + (''+Math.random()).substr(2, 3)
		'//password': 'ddddd'
		channels: [
			'#documentcloud'
			'#persevere'
			'#persevere1234'
			'#openlgtv'
		]
		host: 'irc.freenode.net'
		port: 6667
	db:
		url: 'mongodb://127.0.0.1:27017/irc'
		table: 'irc'
	print: true # dump formatted lines to stdout?
