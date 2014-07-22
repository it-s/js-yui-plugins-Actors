YUI.add('actors-plugin', function (Y) {
  'use strict';

  Y.namespace('Plugins');

  // --------------------------- //
  // ---- Actors plugin
  // ----*******************---- //
  // --------------------------- //

  var ActorsPlugin = function (config) {
    ActorsPlugin.superclass.constructor.apply(this, arguments);
    this._actors = {};
    this._nodes = {};
    if (config) {
      if (Y.Lang.isArray(config.actors))
        Y.Array.each(config.actors, this.addActor, this);
      if (Y.Object.hasKey(config, 'context')) this.set('context', config.context);
      if (Y.Object.hasKey(config, 'autoBind')) this.set('autoBind', config.autoBind);
      if (Y.Object.hasKey(config, 'removeAttribute')) this.set('removeAttribute', config.removeAttribute);
    }
    if (this.get('autoBind')) {
//      this.get('host').delegate('DOMNodeInserted', this.bindAll, this);
//      this.get('host').delegate('DOMNodeRemoved', this.bindAll, this);
      this.bindAll();
    }

  };

  ActorsPlugin.NAME = 'actors';
  ActorsPlugin.NS = 'actors';

  ActorsPlugin.ATTRS = {
    context: {
      value: window
    },
    autoBind: {
      value: true
    },
    removeAttribute: {
      value: true
    }
  };

  Y.extend(ActorsPlugin, Y.Plugin.Base, {
    destructor: function () {
      this.get('host').detach('nodeChange', this.unbindAll, this);
      //TODO detach all attched events
    },
    //Privates:
    //JSON way:
    _parseDataActorDefinition: function (node) {
      var data = node.getData('actors'),
        definition;
      //TODO this should throw a warning or an eror
      if (!Y.Lang.isString(data)) return;

      //Test if the definition is a full JSON or abbriviated JSON
      if (!/^\s*{\s*\w+\s*:/.test(data)) data = "{" + data + "}"; //Not a full JSON. Adding curly brackets to make it work...
      //Parse JSON definition into a JS Object
      try {
        definition = JSON.parse(data);
      } catch (e) {
        throw new Error("_parseDataActorDefinition(): Could not parse actor definition (" + data + ") from node " + node.toString() + " for the following reason: " + e.message + ". Please check your HTML.")
      }
      //Check if required actor is present
      var actors = Y.Object.keys(definition);
      for (var i = 0; i < actors.length; i++) {
        if (!this.hasActor(actors[i])) throw new Error("_parseDataActorDefinition(): Actor (" + actors[i] + ") you requested at node " + node.toString() + " is not available.");
      }
      if (this.get('removeAttribute')) node.removeAttribute('data-actors');
      return definition;
    },
    //Managing actors:
    isValidActor: function (actor) {
      //TODO
      return true;
    },
    getActors: function () {
      return this._actors;
    },
    addActor: function (actor) {
      if (!Y.Lang.isFunction(actor) && !Y.Lang.isObject(actor)) throw new Error("addActor(): Can not add a non Function to actors list.");
      if (!this.isValidActor(actor)) {
        throw new Error("addActor(): Actor you supplied is invalid. Skipping.");
        return false;
      }
      var fnName = actor.NAME || actor.name;
      if (this.hasActor(fnName)) console.warn('addActor(): Actor by the name ' + fnName + ' already exists in the definition and will be replaced.');
      this._actors[fnName] = actor;
      return true;
    },
    hasActor: function (actor) {
      if (Y.Lang.isFunction(actor)) return Y.Object.hasValue(this._actors, actor);
      if (Y.Lang.isString(actor)) return Y.Object.hasKey(this._actors, actor);
      throw new Error("hasActor(): The argument must be a function name, or instance.");
    },
    getActorByName: function (name) {
      if (!Y.Lang.isString(name)) throw new Error("getActorByName(): The argument must be an Actor name as String.");
      return this.hasActor(name) ? this._actors[name] : null;
    },
    removeActor: function (actor) {
      var fnName = Y.Lang.isFunction(actor) ? (actor.NAME || actor.name) : actor;
      if (!Y.Lang.isString(fnName)) throw new Error("removeActor(): The argument must be a function instance, or a function name as String.");
      if (!this.hasActor(fnName)) throw new Error("removeActor(): There is no actor named " + fnName + " in the list.");
      delete this._actors[fnName]; //Remove actor from the list
    },
    //Managing nodes
    getNodes: function () {
      return this._nodes;
    },
    addNode: function (node) {
      //TODO add propor error checking
      var nodeID = node.get('id') || node._yuid;
      if (this.hasNode(nodeID)) {
        console.warn('addNode(): Node with ID ' + nodeID + ' already exists in the definition no need to add again.');
        return this._nodes[nodeID];
      }
      return this._nodes[nodeID] = {
        node: node,
        actors: {},
        bindings: {}
      };
    },
    hasNode: function (node) {
      var nodeID = Y.Lang.isString(node) ? node : node.get('id');
      return Y.Object.hasKey(this._nodes, nodeID);
    },
    removeNode: function (nodeID) {
      if (!Y.Lang.isString(nodeID)) throw new Error("removeNode(nodeID): Was expecting String as an argument, got: " + typeof (nodeID));
      if (!this.hasNode(nodeID)) throw new Error("removeNode(): There is no node with ID " + nodeID + " in the list.");
      delete this._nodes[nodeID];
    },
    //Managing subscriptions
    bindNode: function (nodeDef) {
      var node = nodeDef['node'],
        actors = Y.Object.keys(nodeDef['actors']),
        bindings = nodeDef['bindings'];
      for (var i = 0; i < actors.length; i++) {
        var actor = this.getActorByName(actors[i]),
          args = nodeDef.actors[actors[i]];
        if (bindings[actors[i]]) console.warn("bindNode(): Binding for actor " + actors[i] + " on node " + node.toString() + "already exists. Skipping.");
        else {
          bindings[actors[i]] = new actor(this, args);
          bindings[actors[i]].subscribe(node);
        }
      }
    },
    unbindNode: function (nodeDef) {
      var actors = Y.Object.keys(nodeDef['actors']),
        bindings = nodeDef['bindings'];
      for (var i = 0; i < actors.length; i++) {
        //Unsubscribe from the listeneres (if any)
        bindings[actors[i]].unsubscribe();
        //And then delete the plugin instance
        delete bindings[actors[i]];
      }
    },
    bindAll: function () {
      this.cleanBindings(); //Scan through existing bindings we have and remove all lost and deleted nodes
      var host = this.get('host');
      host.all('[data-actors]').each(function (node) {
        var nodeDef = this.addNode(node);
        nodeDef['actors'] = this._parseDataActorDefinition(node);
        this.bindNode(nodeDef);
      }, this);
    },
    cleanBindings: function () {
      var nodes = Y.Object.keys(this._nodes);
      if (nodes.length === 0) return; //We have no nodes added yet. Abort cleanup.
      for (var i = 0; i < nodes.length; i++) {
        //check if node still exists, and if not - remove it properly.
        if (Y.Lang.isNull(this._nodes[nodes[i]].node._node)) {
          this.unbindNode(this._nodes[nodes[i]]);
          delete this._nodes[nodes[i]];
        }
      }
    },
    unbindAll: function () {
      var nodes = Y.Object.keys(this._nodes);
      if (nodes.length === 0) return; //We have no nodes added yet. Abort cleanup.
      for (var i = 0; i < nodes.length; i++) {
        //check if node still exists, and if not - remove it properly.
        this.unbindNode(this._nodes[nodes[i]]);
        delete this._nodes[nodes[i]];
      }
      this.detach();
    }
  });

  Y.namespace('Plugins').ActorsPlugin = ActorsPlugin;

  // Base Actor - basic event setup to inherit from
  function BaseActor(parent, args) {
    this._parent = parent;
    this._args = args;
    this.EVENT = 'click';
  }
  BaseActor.prototype = {
    getParent: function () {
      return this._parent;
    },
    getArgs: function () {
      return this._args;
    },
    getContext: function () {
      return this._parent.get('context');
    },
    getNode: function () {
      return this._node;
    },
    setNode: function (node) {
      this._node = node;
    },
    subscribe: function (node) {
      this._node = node;
      node.on(this.EVENT, this.act, this);
      return this;
    },
    unsubscribe: function () {
      this._node.detach(this.EVENT, this.act);
    }
  }
  Y.namespace('Plugins').ActorsPluginBaseActor = BaseActor;

}, '0.0.1', {
  requires: ['node', 'plugin']
});
