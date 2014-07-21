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

  CallActor.NAME = 'call';
  CallActor.prototype.act = function (e) {
    var args = this.getArgs(),
      context = this.getContext();
    context[args.fn](args.params, this.getNode(), e);
  }

  // --------------------------- //
  // ---- CSS Toggler
  // ---- Toggles css selector specified on event provided , or on Click
  // ----*******************---- //
  // --------------------------- //
  function OnClickCSSToggle(parent, args) {
    CallActor.superclass.constructor.call(this, parent, args);
  }
  Y.extend(OnClickCSSToggle, Y.Plugins.ActorsPluginBaseActor);

  OnClickCSSToggle.NAME = 'cssToggle';
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
    return "change" + attr.charAt(0).toUpperCase() + attr.slice(1);
  };
  ObserveActor.prototype.getObservableType = function () {
    var args = this.getArgs();
    if (Y.Object.hasKey(args, 'model') && Y.Object.hasKey(args, 'attr')) return ObserveActor.IS_MODEL;
    if (Y.Object.hasKey(args, 'modelList') && Y.Object.hasKey(args, 'attr') && Y.Object.hasKey(args, 'id')) return ObserveActor.IS_MODEL_LIST;
    return ObserveActor.IS_INVALID;
  };
  ObserveActor.prototype.subscribe = function (node) {
    var args = this.getArgs(),
      context = this.getContext(),
      modelList = args['modelList'],
      id = args['id'],
      model = args['model'],
      attr = args['attr'],
      setOnLoad = args['setOnLoad'] || false;
    this.setNode(node);
    switch (this.getObservableType()) {
    case ObserveActor.IS_MODEL:
      if (!Y.Object.hasKey(context, model)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no model " + model + ".");
      context[model].on(attr + 'Change', this.act, this);
      break;
    case ObserveActor.IS_MODEL_LIST:
      if (!Y.Object.hasKey(context, modelList)) throw new Error("ObserveActor.subscribe(): Provided context " + context.toString() + "has no ModelList " + modelList + ".");
      context[modelList].getById(id).on(attr + 'Change', this.act, this);
      break;
    default:
      throw new Error("ObserveActor.subscribe(): It looks like the settings you provided are invalid. Got: " + attr.toString() + ".");
    }
    //Check if context has the model we want:

    if (setOnLoad) this.act();
  }
  ObserveActor.prototype.unsubscribe = function () {
    var args = this.getArgs(),
      context = this.getContext(),
      model = args['model'],
      attr = args['attr'];
    context[model].detach(attr + 'Change', this.act);
  }
  ObserveActor.prototype.act = function (e) {
    var node = this.getNode();
    if (e) node.setHTML(e.newVal);
    else {
      var args = this.getArgs(),
        context = this.getContext(),
        model = args['model'],
        attr = args['attr'];
      node.setHTML(context[model].get(attr));
    }
  }

  Y.namespace('Plugins').ActorsPluginActors = [
    CallActor,
    OnClickCSSToggle,
    ObserveActor
  ];

}, '0.0.1', {
  requires: ['node', 'actors-plugin']
});