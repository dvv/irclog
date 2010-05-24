#!/usr/bin/python

import sys, datetime, random
import pymongo
import pexpect

# TODO: let nick random, without pass
nick = 'your-nick-here'
password = 'your-password-here'

server = 'irc.freenode.net'
port = 6667
# comma-separated list of channels to listen to. leading # is honored. case sensitive
channels = '#persevere'

# connector e.g. ssh tunnel
connection_helper = False #'ssh user@host'

# dump in text format

# DB
db = False # comment out the following lines to not dump to DB
db = pymongo.Connection('localhost', 27017)
db = db.irc
db = db.posts

# text
dump_text = False # set to True to enable text dump in stdout
# log raw data
dump_raw = False

# connect to IRC server
irc = pexpect.spawn(('%s telnet %s %d' % (connection_helper or '', server or 'irc.freenode.net', port or 6667)).strip())
irc.logfile = sys.stdout
if dump_raw:
	irc.logfile_read = file('pirc.log', 'a')
irc.expect  ('\*\*\* No Ident response')
irc.sendline('NICK %s' % nick)
if password:
	irc.sendline('PASS %s' % password)
irc.sendline('USER %s foo bar :Logger' % nick)
#irc.expect  ('PRIVMSG %s :.*VERSION' % nick)
# join channels
irc.sendline('JOIN %s' % channels)
#### wait till connected to the last channel
###irc.expect  ('%s %s :End of \/NAMES list\.' % (nick, channels.split(',')[-1]))
# log messages, handle PING, exit on EOF
while True:
	# TODO: support multiple channels
	code = irc.expect([':(\w+)![^\s]+ PRIVMSG (#\w+) :(.*)', 'PING :(.*)', pexpect.EOF], timeout=None)
	if code == 0:
		date = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
		author = irc.match.group(1)
		channel = irc.match.group(2)
		text = irc.match.group(3).strip()
		#import pdb; pdb.set_trace()
		# dump to DB
		if db:
			#id = random.random().__str__()[2:] + random.random().__str__()[2:]
			#db.save(dict(_id=id, date=date, channel=channel, author=author, text=text))
			db.save(dict(date=date, channel=channel, author=author, text=text))
		# dump in text format
		if dump_text:
			print date, channel, author, text
	elif code == 1:
		irc.send(irc.after.replace('PING :','PONG :'))
	else:
		break
