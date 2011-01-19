/*
 * TODO:
 * RQL as _ plugin
 * form from schema
 * i18n switch -- reload
 * make chrome model attribute user also model
 * navigation should honor model.schema
 * centralized error showing
 * 3/5 !!!filters again!!!
 * 3/5 !!!pager!!!
 */

var model;

var currentLocale = 'en'; // FIXME: force locale here. cookie?
require({
	locale: currentLocale
}, [
	'js/bundle.js'
//	'rql',
//	'i18n!nls/forms' // i18n
], function(x1, RQL, i18nForms){

//window.RQL = RQL;

// improve _
_.mixin({
	partial: function(templateIds, data){
		if (!_.isArray(templateIds)) {
			templateIds = [templateIds, 'notfound'];
		}
		var text = null;
		_.each(templateIds, function(tid){
			//console.log('PART?', tid);
			var t = $('#tmpl-'+tid);
			if (t && !text) {
				text = t.text();
				//console.log('PART!', text);
			}
		});
		return text ? _.template(text, data) : '';
	},
	// i18n-aware strings
	T: function(id){
		return id;
		var text = i18nForms[id] || id;
		if (arguments.length > 1) {
			var args = Array.prototype.slice.call(arguments);
			args[0] = text;
			text = _.sprintf.apply(null, args);
		}
		return text;
	}
});

function RPC(url, data, options){
	Backbone.sync('create', {
		url: url,
		toJSON: function(){return data;}
	}, {
		success: options.success || function(){
			model.set({flash: _.T('OK')});
		},
		error: function(xhr){
			console.log('ERR', arguments, model);
			var err = xhr.responseText;
			try {
				err = JSON.parse(err);
			} catch (x) {
				if (err && err.message) err = err.message;
			}
			options.error && options.error(err) || model.set(_.isArray(err) ? {errors: err} : {error: err});
		}
	});
}

// DOM is loaded
require.ready(function(){ //

var ErrorApp = Backbone.View.extend({
	el: $('#errors'),
	render: function(){
		this.el.html(_.partial('errors', {model: model})).show().delay(5000).hide(0, function(){
			_.each(['flash', 'error', 'errors'], function(x){
				model.unset(x, {silent: true});
			});
		});
		return this;
	},
	events: {
	},
	initialize: function(){
		_.bindAll(this, 'render');
		model.bind('change:flash', this.render);
		model.bind('change:error', this.render);
		model.bind('change:errors', this.render);
	}
});

var HeaderApp = Backbone.View.extend({
	el: $('#header'),
	render: function(){
		this.el.html(_.partial('header', model.toJSON()));
		return this;
	},
	events: {
	},
	initialize: function(){
		_.bindAll(this, 'render');
		model.bind('change', this.render);
	}
});

var FooterApp = Backbone.View.extend({
	el: $('#footer'),
	render: function(){
		this.el.html(_.partial('footer', {
			// 4-digit year as string -- to be used in copyright (c) 2010-XXXX
			year: (new Date()).toISOString().substring(0, 4)
		}));
		return this;
	},
	events: {
	},
	initialize: function(){
		_.bindAll(this, 'render');
		model.bind('change', this.render);
	}
});

var NavApp = Backbone.View.extend({
	el: $('#nav'),
	render: function(){
		this.el.html(_.partial('navigation', model.toJSON()));
		this.$('#search :input').focus();

		// N.B. workaround: textchange event can not be delegated...
		// reload the View after a 0.6 sec timeout elapsed after the last textchange event on filters
		var self = this;
		var timeout;
		this.$('#search :input').bind('textchange', function(){
			clearTimeout(timeout);
			var $this = $(this);
			timeout = setTimeout(function(){
				model.set({search: $this.val()}, {silent: true});
				self.reload();
			}, 600);
			return false;
		});

		return this;
	},
	events: {
		//'submit #search': 'search'
	},
	initialize: function(){
		_.bindAll(this, 'render');
		model.bind('change', this.render);
	},
	reload: function(){
		var entity = model.get('entity');
		location.href = '/#' + entity.url + '?q=' + model.get('search');
		//encodeURIComponent(text);
	},
	search: function(e){
		var text = $(e.target).find('input').val();
		//if (!text) return false;
		//alert('TODO SEARCH FOR ' + text);
		return false;
	}
});

//
// #content application
//
var App = Backbone.View.extend({
	el: $('#content'),
	render: function(){
		console.log('RENDER', model.toJSON());
		$(this.el).html(_.partial('list', model.toJSON()));
		return this;
	},
	events: {
	},
	initialize: function(){
		_.bindAll(this, 'render');
		model.bind('change', this.render);
		model.get('entity').bind('refresh', this.render);
	}
});

//
// controller listens to the route and sets chrome model attributes
//
var Controller = Backbone.Controller.extend({
	routes: {
		// url --> handler
	},
	initialize: function(){
		// entity viewer
		this.route(/^([^/?]+)(?:\?(.*))?$/, 'entity', function(name, query){
			model.set({search: decodeURIComponent((query||'').substring(2))}, {silent: true});
			var entity = model.get('entity');
			entity.name = name;
			entity.url = name;
			//entity.query = RQL.Query(query);
			console.log('ROUTE', arguments, entity);
			//console.log('QUERY', name, query, entity);
			entity.fetch({
				//url: entity.url + (query ? '?' + query : ''),
				url: 'http://archonsoftware.com:8000/' + entity.url + (query ? '?' + query : ''),
				dataType: 'jsonp',
				error: function(x, xhr, y){
					entity.refresh();
					model.set({error: xhr.responseText});
				},
				success: function(data){
					model.set({errors: []});
					console.log('FETCHED', data);
				}
			});
		});
	}
});

/////////////////////

var List = Backbone.Collection.extend({
	parse: function parse(data){
		return data.data;
	}
});

// central model -- global scope
model = new Backbone.Model({
	errors: [],
	entity: new List(),
	search: ''
});

//
new ErrorApp;
new HeaderApp;
new NavApp;
new FooterApp;
new App;

// let the history begin
model.set({started: true});
var controller = new Controller();
Backbone.history.start();

/////////////////////

}); // require.ready

}); // require
