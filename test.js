'use strict';

var re = /:(\w+)![^\s]+ PRIVMSG (#[\w\.]+) :(.*)/;
var line = ':ddddd!4fab0b5e@gateway/web/freenode/ip.79.171.11.94 PRIVMSG #now.js :aaaa';
line.replace(re, function(string, author, channel, text) {
	console.log('LINE', arguments);
});
