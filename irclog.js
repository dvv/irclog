'use strict';
var config, db, glob2re, parseUrl, serve, server, staticFileServer, str2num, sys;
var config = require('./config');
var db = require('nedis').createClient();
  '# connect to IRC server\n# TODO: proxy?!\nbuf = \'\'\nconn = require(\'net\').createConnection config.irc.port, config.irc.host\n#conn.on \'connect\', ->\nconn.on \'data\', (data) ->\n	#console.log \'\'+data\n	buf += data\n	lines = buf.split \'\n\'\n	while lines.length > 1\n		line = lines.shift()\n		if line.indexOf(\'\*\*\* No Ident response\') >= 0\n			@write \'NICK \' + config.irc.nick + \'\n\'\n			if config.irc.password\n				@write \'PASS \' + config.irc.password + \'\n\'\n			@write \'USER \' + config.irc.nick + \' foo bar :Logger\n\'\n			config.irc.channels.forEach (channel) =>\n				@write \'JOIN \' + channel + \'\n\'\n		else if line.indexOf(\'PING :\') is 0\n			@write line.replace(/^PING/, \'PONG\') + \'\n\'\n		else\n			# dump the line to DB\n			line.replace /:(\w+)![^\s]+ PRIVMSG (#\w+) :(.*)\r/, (string, author, channel, text) ->\n				date = new Date().toISOString()\n				if config.print\n					console.log date + \'\t\' + author + \'\t\' + channel + \'\t\' + text\n				db.insert config.db.table, {date: date, channel: channel, author: author, text: text} #, (err, doc) -> console.log \'INSERTED\', err, doc\n	buf = lines[0]';
  server = require('http').createServer();
  staticFileServer = new (require('static/node-static').Server)('public', {
    cache: 3600
  });
  server.on('request', function(req, res) {
    if (req.method === 'GET') {
      return staticFileServer.serve(req, res, function(err, data) {
        if ((err != null ? err.status : void 0) === 404) {
          return serve(req, res);
        }
      });
    } else {
      res.writeHead(405);
      return res.end();
    }
  });

  sys = require('util');
  parseUrl = require('url').parse;
  serve = function(req, res) {
    var channel, meta, page, pageSize, re, search, url;
    url = parseUrl(req.url, true);
    console.log('REQ', sys.inspect(url));
    search = {};
    page = str2num(url.query.p, 0);
    pageSize = 100;
    meta = {
      skip: page * pageSize,
      limit: pageSize
    };
    channel = url.pathname.substring(1).split('/')[0];
    if (channel && channel !== 'all') {
      search.channel = '#' + channel;
    }
    if (url.query.q) {
      re = glob2re('*' + url.query.q + '*');
      search.$or = [
        {
          author: re
        }, {
          text: re
        }
      ];
    }
    return db.find(config.db.table, search, meta, function(err, docs) {
      var str;
      if (err) {
        res.writeHead(403, {
          'content-type': 'text/plain'
        });
        return res.end(err.message || err);
      } else {
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8'
        });
        docs.forEach(function(doc) {
          doc.id = doc._id;
          return delete doc._id;
        });
        str = JSON.stringify({
          posts: docs,
          channels: config.irc.channels
        });
        return res.end(url.query.callback ? "" + url.query.callback + "(" + str + ")" : str);
      }
    });
  };
  server.listen(8000);
  console.log("HTTP server running at http://*:8000/. Use CTRL+C to stop.");
  str2num = function(x, def, max) {
    x = +x;
    x = x === x && x || def;
    if ((max != null) && x > max) {
      x = max;
    }
    return x;
  };
  glob2re = function(x) {
    var s;
    s = decodeURIComponent(x).replace(/([\\|\||\(|\)|\[|\{|\^|\$|\*|\+|\?|\.|\<|\>])/g, function(x) {
      return '\\' + x;
    }).replace(/\\\*/g, '.*').replace(/\\\?/g, '.?');
    s = s.substring(0, 2) !== '.*' ? '^' + s : s.substring(2);
    s = s.substring(s.length - 2) !== '.*' ? s + '$' : s.substring(0, s.length - 2);
    return new RegExp(s, 'i');
  };
}).call(this);
