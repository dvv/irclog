#!/usr/bin/python
import sys, datetime
import pymongo

channel = '#persevere'

db = pymongo.Connection('localhost', 27017)
db = db.irc
db = db.posts

date = None
while True:
	s = sys.stdin.readline()
	if not s: break
	if s.startswith('---'):
		s = s.strip().split(' ')[4:]
		if len(s) > 3: s = s[0:2] + s[3:4]
		s = ' '.join(s)
		date = datetime.datetime.strptime(s, '%b %d %Y').date()
		#print s, date.strftime('%Y-%m-%dT%H:%M:%SZ')
	else:
		p = s.split('< ')
		if len(p) < 2: continue
		time = datetime.datetime.strptime(p[0], '%H:%M:%S').time()
		d = datetime.datetime.combine(date, time)
		p = p[1].split('> ')
		author = p[0]
		text = p[1].strip()
		d += datetime.timedelta(hours=(4+(d<datetime.datetime(2010,3,14,2,0,0))))
		db.save(dict(date=d.strftime('%Y-%m-%dT%H:%M:%SZ'), channel=channel, author=author, text=text))
		print d.strftime('%Y-%m-%dT%H:%M:%SZ'), channel, author, text
