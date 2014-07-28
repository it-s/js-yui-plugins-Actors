YUI.add('actors-plugin-actors', function (Y) {
  'use strict';

  // --------------------------- //
  // ---- Call actor
  // ---- calls a function at context specified with parameters provided
  // ----*******************---- //
  // --------------------------- //

  function CallActor(parent, args) {
    CallActor.superclass.constructor.call(this, parent, args);
  }
  Y.extend(CallActor, Y.Plugins.ActorsPluginBaseActor);

  CallActor.NAME = 'click';

  CallActor.IS_UNDEFINED = -1;
  CallActor.IS_FN_CALL = 0;
  CallActor.IS_CLASS_TOGGLE = 1;
  CallActor.IS_CLASS_FN = 2;
  CallActor.prototype._getActType = function () {
    var args = this.getArgs();
    if (args['fn'] && args['class'] && args['toggleClass']) return CallActor.IS_CLASS_FN + CallActor.IS_CLASS_TOGGLE;
    if (args['fn'] && args['class']) return CallActor.IS_CLASS_FN;
    if (args['fn']) return CallActor.IS_FN_CALL;
    if (args['class']) return CallActor.IS_CLASS_TOGGLE;
    return CallActor.IS_UNDEFINED;
  };
  CallActor.prototype.act = function (e) {
    var node = this.getNode(),
      args = this.getArgs(),
      cssClass = args['class'],
      fn = args['fn'],
      params = args['params'],
      actType = this._getActType(),
      context = this.getContext();
    switch (actType) {
      case CallActor.IS_CLASS_FN + CallActor.IS_CLASS_TOGGLE:
        context[fn](params, node, e);
        node.toggleClass(cssClass);
        break;
      case CallActor.IS_CLASS_FN:
        if (context[fn](params, node, e)) node.addClass(cssClass);
        else node.removeClass(cssClass);
        break;
      case CallActor.IS_FN_CALL:
        context[fn](params, node, e);
        break;
      case CallActor.IS_CLASS_TOGGLE:
        node.toggleClass(cssClass);
        break;
      default:
        throw new Error("CallActor.act(): It looks like the settings you provided are invalid.\n Expected: fn, [params], [class], [toggleClass]\n Got: " + args.toString());
    }
  };

  // --------------------------- //
  // ---- CSS Toggler
  // ---- Toggles css selector specified on event provided , or on Click
  // ----*******************---- //
  // --------------------------- //

  function OnClickCSSToggle(parent, args) {
    CallActor.superclass.constructor.call(this, parent, args);
  }
  Y.extend(OnClickCSSToggle, Y.Plugins.ActorsPluginBaseActor);

  OnClickCSSToggle.NAME = 'toggleClass';
  OnClickCSSToggle.prototype.act = function (e) {
    var node = this.getNode(),
      args = this.getArgs();
    node.toggleClass(args.class);
  }

  // --------------------------- //
  // ---- Observer actor
  // ---- Monitors Model/ModelList attr for changes and sets the HTML of the attached element to it.
  // ----*******************---- //
  // --------------------------- //

  function ObserveActor(parent, args) {
    CallActor.superclass.constructor.call(this, parent, args);
    this.EVENT = 'change';
  }
  Y.extend(ObserveActor, Y.Plugins.ActorsPluginBaseActor);

  ObserveActor.NAME = 'observe';
  ObserveActor.IS_INVALID = -1;
  ObserveActor.IS_MODEL = 0;
  ObserveActor.IS_MODEL_LIST = 1;
  ObserveActor.prototype._attrNameToEvent = function (attr) {
    return attr + 'Change';
  };

  ObserveActor.prototype._getObservableType = function () {
    var args = this.getArgs();
    if (Y.Object.hasKey(args, 'model') && Y.Object.hasKey(args, 'attr')) return ObserveActor.IS_MODEL;
    if (Y.Object.hasKey(args, 'modelList') && Y.Object.hasKey(args, 'attr') && Y.Object.hasKey(args, 'id')) return ObserveActor.IS_MODEL_LIST;
    return ObserveActor.IS_INVALID;
  };
  ObserveActor.prototype._getObservedObject = function () {
    var context = this.getContext(),
      object = this.getArgs()['model'] || this.getArgs()['modelList'] || null;
    return object ? (Y.Object.hasKey(context, object) ? context[object] : context.get(object)) : null;
  };
  ObserveActor.prototype.subscribe = function (node) {
    var args = this.getArgs(),
      context = this.getContext(),
      modelList = args['modelList'],
      id = args['id'],
      model = args['model'],
      event = this._attrNameToEvent(args['attr']),
      fn = args['fn'] || false,
      setOnLoad = args['actOnLoad'] || false;
    this.setNode(node);
    switch (this._getObservableType()) {
      case ObserveActor.IS_MODEL:
        /* Try to get model from the context. If model is not a property of the context we try to GET it. */
        var _model = this._getObservedObject();
        if (Y.Lang.isNull(_model)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no model " + model + ".");
        _model.on(event, this.act, this);
        break;
      case ObserveActor.IS_MODEL_LIST:
        var _list = this._getObservedObject();
        if (Y.Lang.isNull(_list)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no ModelList " + modelList + ".");
        _list.getById(id).on(event, this.act, this);
        break;
      default:
        throw new Error("ObserveActor.subscribe(): It looks like the settings you provided are invalid. Expected:\n model/modelList, attr, [id], [fn], [setOnLoad]\n Got: " + args.toString());
    }
    //Check if context has the model we want:

    if (setOnLoad) this.act();
  }
  ObserveActor.prototype.unsubscribe = function () {
    var args = this.getArgs(),
      context = this.getContext(),
      model = args['model'],
      event = this._attrNameToEvent(args['attr']),
      attr = args['attr'],
      id = args['id'];
    switch (this._getObservableType()) {
      case ObserveActor.IS_MODEL:
        /* Try to get model from the context. If model is not a property of the context we try to GET it. */
        var _model = this._getObservedObject();
        if (Y.Lang.isNull(_model)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no model " + model + ".");
        _model.detach(event, this.act);
        break;
      case ObserveActor.IS_MODEL_LIST:
        var _list = this._getObservedObject();
        if (Y.Lang.isNull(_list)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no ModelList " + modelList + ".");
        _list.getById(id).detach(event, this.act);
        break;
      default:
        throw new Error("ObserveActor.unsubscribe(): It looks like the settings you provided are invalid. Expected: model/modelList, attr, [id], [fn], [setOnLoad]; Got: " + args.toString());
    }
  }
  ObserveActor.prototype.act = function (e) {
    var node = this.getNode(),
      args = this.getArgs(),
      context = this.getContext(),
      attr = args['attr'],
      id = args['id'],
      fn = args['fn'],
      target = args['target'] || "HTML", 
      value;
    if (e) {
      value = e.newVal;
    } else {
      value = this._getObservableType() === ObserveActor.IS_MODEL ?
        this._getObservedObject().get(attr) :
        this._getObservedObject().getById(id).get(attr);
    }
    if(target === "HTML") node.setHTML(value);
      else node.setAttribute(target, value);
    if(fn) context[fn](value, node, e);
  }


  // --------------------------- //
  // ---- Sync Actor
  // ---- Monitor ModelList Add/Remove/Change events
  // ----*******************---- //
  // --------------------------- //

  function SyncActor(parent, args) {
    CallActor.superclass.constructor.call(this, parent, args);
    this.EVENT = 'change';
  }
  Y.extend(SyncActor, Y.Plugins.ActorsPluginBaseActor);

  SyncActor.NAME = 'sync';

  SyncActor.prototype._initTemplate = function() {
    var node = this.getNode(),
        template = node.getHTML();
    this._template = template;
    //Remove the template from the element
    node.setHTML("");
  };

  SyncActor.prototype._getTemplate = function() {
    return this._template;
  };

  SyncActor.prototype._getObservedObject = function () {
    var context = this.getContext(),
      object = this.getArgs()['list'] || null;
    return object ? (Y.Object.hasKey(context, object) ? context[object] : context.get(object)) : null;
  };

  SyncActor.prototype.subscribe = function (node) {
      var list = this._getObservedObject(),
        args = this.getArgs(),
        setOnLoad = args['actOnLoad'] || false;
      this.setNode(node);

      this._initTemplate();
      list.after('add', this.act, this);
      list.after('remove', this.act, this);
      if(setOnLoad) this.act();
  };
  SyncActor.prototype.unsubscribe = function (node) {
      var node = this.getNode(),
      args = this.getArgs(),
      list = this._getObservedObject(),
      fn = args['fn'] || false,
      setOnLoad = args['actOnLoad'] || false;

      list.detach('add', this.act);
      list.detach('remove', this.act);
  };
  SyncActor.prototype.act = function (e) {
    var parent = this._parent,
      node = this.getNode(),
      args = this.getArgs(),
      list = this._getObservedObject(),
      fn = args['fn'] || false,
      template = this._getTemplate(),
      html = "";

    list.each(function(model, index, list){
      var id = model.get('id');
      html += template.replace(/actors=/g, 'data-actors=').replace(/\{\{ID\}\}/g, id);
    }, this);

    node.setHTML(html);

    parent.cleanBindings();
    node.all('[data-actors]').each(function (node) {
        var nodeDef = this.addNode(node);
        nodeDef['actors'] = this._parseDataActorDefinition(node);
        this.bindNode(nodeDef);
      }, parent);
  }


  Y.namespace('Plugins').ActorsPluginActors = [
    CallActor,
    OnClickCSSToggle,
    ObserveActor,
    SyncActor
  ];

}, '0.0.1', {
  requires: ['node', 'actors-plugin']
});
