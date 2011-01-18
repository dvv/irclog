module.exports =
	irc:
		nick: 'dddddd'
		'//password': 'ddddd'
		channels: [
			'#persevere1234'
		]
		host: 'irc.freenode.net'
		port: 6667
	db:
		#url: 'mongodb://dvv:dvv@flame.mongohq.com:27068/irc'
		host: '127.0.0.1'
		port: 27017
		name: 'test'
		table: 'irc'
	print: true # dump formatted lines to stdout?
