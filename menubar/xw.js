/**
 * Core XWidgets framework
 * @author Shane Bryzak
 */

// object.watch support - Public Domain (thanks to eligrey - https://gist.github.com/eligrey/384583)
if (!Object.prototype.watch) {
  Object.defineProperty(Object.prototype, "watch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: function (prop, handler) {
      var oldval = this[prop],
        newval = oldval,
        getter = function () {
          return newval;
        },
        setter = function (val) {
          oldval = newval;
          return newval = handler.call(this, prop, oldval, val);
        };
      if (delete this[prop]) { // can't watch constants
        Object.defineProperty(this, prop, {
          get: getter,
          set: setter,
          enumerable: true,
          configurable: true
        });
      }
    }
  });
};
 
// object.unwatch
if (!Object.prototype.unwatch) {
  Object.defineProperty(Object.prototype, "unwatch", {
    enumerable: false,
    configurable: true,
    writable: false,
    value: function (prop) {
      var val = this[prop];
      delete this[prop]; // remove accessors
      this[prop] = val;
    }
  });
};

function package(fullName) {
  var i;
  var pkg = window;
  var parts = fullName.split(".");
  for (i = 0; i < parts.length; i++) {
    if (typeof pkg[parts[i]] === "undefined") {
      pkg[parts[i]] = {};
    }
    pkg = pkg[parts[i]];
  }
};

// XWidgets namespace
var xw = {
  // Constants
  CORE_NAMESPACE: "http://xwidgets.org/core",
  XHTML_NAMESPACE: "http://www.w3.org/1999/xhtml",
  // Methods
  Browser: function() {
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) === '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile.*Safari/.test(ua)
    }
  }
};

//
// System Utils
//
xw.Sys = {
  getObject: function(id) {
    if (document.getElementById && document.getElementById(id)) {
      return document.getElementById(id);
    } else if (document.all && document.all(id)) {
      return document.all(id);
    } else if (document.layers && document.layers[id]) {
      return document.layers[id];
    } else {
      return null;
    }
  },
  createHttpRequest: function(mimeType) {
    if (window.XMLHttpRequest) {
      var req = new XMLHttpRequest();
      if (mimeType !== null && req.overrideMimeType) {
        req.overrideMimeType(mimeType);
      }
      return req;
    }
    else {
      return new ActiveXObject("Microsoft.XMLHTTP");
    }
  },
  //
  // Asynchronously loads the javascript source from the specified url
  //   callback - the callback function to invoke if successful
  //   failCallback = the callback function to invoke if loading failed
  //
  loadSource: function(url, callback, failCallback) {
    var req = xw.Sys.createHttpRequest("text/plain");
    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        if (req.status === 200 || req.status === 0) {
          var e = document.createElement("script");
          e.language = "javascript";
          e.text = req.responseText;
          e.type = "text/javascript";
          var head = document.getElementsByTagName("head")[0];
          if (head === null) {
            head = document.createElement("head");
            var html = document.getElementsByTagName("html")[0];
            html.insertBefore(head, html.firstChild);
          }
          try {
            head.appendChild(e);           
          } catch (err) {
            window.alert("There was an error loading the script from '" + url + "': " + err);
            return;
          }
          if (callback) {
            callback(url);
          }               
        } else if (req.status === 404) {
          window.alert("404 error: the requested resource '" + url + "' could not be found.");
          if (failCallback) {
            failCallback();
          }
        }
      }
    };

    req.open("GET", url, true);
    req.send(null);
  },
  basePath: null,
  getBasePath: function() {
    if (xw.Sys.basePath === null) {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var match = scripts[i].src.match( /(^|.*[\\\/])xw.js(?:\?.*)?$/i );
        if (match) {
          xw.Sys.basePath = match[1];
          break;
        }
      }
    }
    
    // Create an EL binding for the basePath
    xw.EL.registerResolver({
      canResolve: function(expr) {
        return "basePath" == expr;
      },
      resolve: function(expr) {
        return "basePath" == expr ? xw.Sys.basePath : undefined;
      }
    });
    
    return xw.Sys.basePath;
  },
  newInstance: function(name) {
    var current, parts, constructorName;
    parts = name.split('.');
    constructorName = parts[parts.length - 1];
    current = window;
    for (var i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    return new current[constructorName]();
  },
  isUndefined: function(value) {
    return value == null && value !== null;
  },
  isDefined: function(value) {
    return !xw.Sys.isUndefined(value);
  },
  classExists: function(fqcn) {
    var parts = fqcn.split(".");
    var partial = "";
    var i;
    for (i = 0; i < parts.length; i++) {
      partial += (i > 0 ? "." : "") + parts[i];
      if (eval("typeof " + partial) === "undefined") return false;
    }
    
    return eval("typeof " + fqcn) === "function";
  },
  cloneObject: function(o) {
    if (o instanceof xw.Widget) return o.clone();
    if (o == null || typeof(o) != 'object') return o;
    var n = new o.constructor();
    for (var key in o) {
      n[key] = xw.Sys.cloneObject(o[key]);
    }
    return n;
  },
  arrayContains: function(arrayVal, value) {
    var i;
    for (i = 0; i < arrayVal.length; i++) {
      if (arrayVal[i] === value) {
        return true;
      }
    }
    return false;
  },
  //
  // Deletes the elements from an array that meet the specified condition
  //
  deleteArrayElements: function(arr, condition) {
    for (var i = arr.length - 1; i >= 0; i--) {
      if (condition(arr[i])) arr.splice(i,1);
    }
  },
  trim: function(value) {
    return value.replace(/^\s+|\s+$/g,"");
  },
  capitalize: function(value) {
    return value.substring(0, 1).toUpperCase() + value.substring(1, value.length);
  },
  chainEvent: function(ctl, eventName, eventFunc) {
    if (ctl.addEventListener) {
      // normal browsers like firefox, chrome and safari support this
      ctl.addEventListener(eventName, eventFunc, false);
    }
    else if (ctl.attachEvent) {
      // irregular browsers such as IE don't support standard functions
      ctl.attachEvent("on" + eventName, eventFunc);
    }
    else {
      // really old browsers
      alert("your browser doesn't support adding event listeners");
    }
  },
  unchainEvent: function(ctl, eventName, eventFunc) {
    if (ctl.detachEvent) {
      ctl.detachEvent("on" + eventName, eventFunc);
    } else if (ctl.removeEventListener) {
      ctl.removeEventListener(eventName, eventFunc, false);
    } else {
      alert("Your browser doesn't support removing event listeners");
    }
  },
  cancelEventBubble: function(event) {
    if (navigator.userAgent.indexOf("MSIE") != -1) {
      window.event.cancelBubble = true;
      window.event.returnValue = false;
    } else {
      event.preventDefault();
    }
    
    if (event.stopPropagation) {
      event.stopPropagation();
    }
  },
  endsWith: function(value, suffix) {
    return value.indexOf(suffix, value.length - suffix.length) !== -1;
  },
  uid: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  },
  //
  // Returns the specified style for an element
  // TODO - probably need to fix this up for safari - use xw.Sys.getBorder() as an example
  //
  getStyle: function(element, cssRule) {
	  var strValue = "";
	  if (document.defaultView && document.defaultView.getComputedStyle) {
		  strValue = document.defaultView.getComputedStyle(element, "").getPropertyValue(cssRule);
	  }
	  else if (element.currentStyle) {
		  cssRule = cssRule.replace(/\-(\w)/g, function (strMatch, p1){
			  return p1.toUpperCase();
		  });
		  strValue = element.currentStyle[cssRule];
	  }
	  return strValue;
  },
  getBorder: function(control) {
    var border = {};
    if (window.navigator.userAgent.indexOf('Safari') === -1) {
      if (control.currentStyle) {
        border.top = parseInt(control.currentStyle.borderTopWidth, 10);
        border.right = parseInt(control.currentStyle.borderRightWidth, 10);
        border.bottom = parseInt(control.currentStyle.borderBottomWidth, 10);
        border.left = parseInt(control.currentStyle.borderLeftWidth, 10);
      }
      else {
        try {
          border.top = parseInt(getComputedStyle(control,null).getPropertyValue('border-top-width'), 10);
          border.right = parseInt(getComputedStyle(control,null).getPropertyValue('border-right-width'), 10);
          border.bottom = parseInt(getComputedStyle(control,null).getPropertyValue('border-bottom-width'), 10);
          border.left = parseInt(getComputedStyle(control,null).getPropertyValue('border-left-width'), 10);
        }
        // last resort
        catch (e) {
          border.top = parseInt(control.style.borderTopWidth, 10);
          border.right = parseInt(control.style.borderRightWidth, 10);
          border.bottom = parseInt(control.style.borderBottomWidth, 10);
          border.left = parseInt(control.style.borderLeftWidth, 10);
        }
      }
    }
    else {
      border.top = parseInt(control.style.getPropertyValue('border-top-width'), 10);
      border.right = parseInt(control.style.getPropertyValue('border-right-width'), 10);
      border.bottom = parseInt(control.style.getPropertyValue('border-bottom-width'), 10);
      border.left = parseInt(control.style.getPropertyValue('border-left-width'), 10);
    }
    return border;
  },
  parseXml: function(body) {
    var doc;
    try {
      doc = new ActiveXObject("Microsoft.XMLDOM");
      doc.async = "false";
      doc.loadXML(body);
      return doc;
    }
    catch (e) {
      doc = new DOMParser().parseFromString(body, "text/xml");
      return doc;
    }
  },
  setObjectProperty: function(obj, property, value) {
    // Check if the object has a setter method
    var setterName = "set" + xw.Sys.capitalize(property);
    
    // Do value conversion here if necessary, but ONLY if the value isn't an EL expression
    if (!xw.EL.isExpression(value)) {
      if (xw.Sys.isDefined(obj[property])) {
        if (typeof obj[property] === "boolean" && typeof value !== "boolean") {
           value = "true" === value;
        }
      }
    }
    
    if (xw.Sys.isDefined(obj, setterName) && typeof obj[setterName] === "function") {
      obj[setterName](value);
    } else {
      obj[property] = value;
    }
  },
  clearChildren: function(e) {
    while (xw.Sys.isDefined(e) && e.hasChildNodes()) {
      e.removeChild(e.firstChild);
    }
  }
};

//
// Logging
//

xw.Log = {
  logWindow: null,
  messages: [],
  scrollback: 1000,
  levels: {
    DEBUG: 100,
    INFO: 200,
    WARN: 300,
    ERROR: 400
  },
  logLevel: "INFO",
  append: function(text, logLevel) {
    var msg = {
      text : text,
      logLevel : logLevel,
      timestamp : new Date()
    };
    if (xw.Log.levels[logLevel] <= xw.Log.levels[xw.Log.logLevel]) {
      xw.Log.messages.push(msg);
      while (xw.Log.messages.length > xw.Log.scrollback) {
        xw.Log.messages.splice(0,1);
      }
      xw.Log.appendToWindow(msg); 
    }
  },
  debug: function(text) {
    xw.Log.append(text, "DEBUG");
  },
  info: function(text) {
    xw.Log.append(text, "INFO");
  },
  warn: function(text) {
    xw.Log.append(text, "WARN");
  },
  error: function(text) {
    xw.Log.append(text, "ERROR");
  },
  appendToWindow: function(msg) {
    if (xw.Log.logWindow) {
      var formattedTime = msg.timestamp.getHours() + ":" + msg.timestamp.getMinutes() + ":" + msg.timestamp.getSeconds();
      xw.Log.logWindow.document.write("<pre>" + formattedTime + " [" + msg.logLevel + "] " +
        msg.text.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;") +
        "</pre><br/>");
    }
  },
  display: function() {
    var attr = "left=400,top=400,resizable=yes,scrollbars=yes,width=400,height=400";
    xw.Log.logWindow = window.open("", "__xwidgetsDebugWindow", attr);
    if (xw.Log.logWindow) {
      xw.Log.logWindow.document.write("<html><head><title>XWidgets Log Window</title></head><body></body></html>");
      var t = xw.Log.logWindow.document.getElementsByTagName("body").item(0);
      t.style.fontFamily = "arial";
      t.style.fontSize = "8pt";
      
      for (var i = 0; i < xw.Log.messages.length; i++) {
        xw.Log.appendToWindow(xw.Log.messages[i]);
      }
    }
  }
};

// 
// Local Storage
// TODO finish implementing this

xw.LocalStorage = {
  isSupported: function() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  },
  getItem: function(key) {
    return xw.LocalStorage.isSupported() ? localStorage.getItem(key) : undefined;
  },
  setItem: function(key, value) {
    if (xw.LocalStorage.isSupported()) {
      localStorage[key] = value;
    }
  },
  remove: function(key) {
    if (xw.LocalStorage.isSupported()) {
      localStorage.removeItem(key);
    }
  },
  clear: function() {
    if (xw.LocalStorage.isSupported()) {
      localStorage.clear();
    }
  },
  length: function() {
    if (xw.LocalStorage.isSupported()) {
      return localStorage.length;
    }
  },
  getKey: function(idx) {
    if (xw.LocalStorage.isSupported()) {
      return localStorage.key(idx);
    }
  }
};

// 
// Expression language
//

xw.EL = {
  resolvers: [],
  // Array of {widget: widget, propertyName: propertyName (or callback), expression: expr};
  bindings: [],
  // This is a function because some versions of some browsers cache the regex object,
  // so we need to create a new instance each time for cross-browser compatibility
  regex: function(expr) {  
    return (typeof expr == "string") ? /#{(!?)([A-Za-z0-9]+(\.[A-Za-z0-9]+)*)}/g.exec(expr) :
      /#{(!?)([A-Za-z0-9]+(\.[A-Za-z0-9]+)*)}/g;
  },
  isExpression: function(expr) {
    return (typeof expr == "string") && xw.EL.regex().test(expr);
  },
  isValueExpression: function(expr) {
    if (xw.EL.isExpression(expr)) {
      var m = expr.match(xw.EL.regex());
      return m.length == 1 && m[0] == expr;
    }
    return false;
  },
  isInterpolatedExpression: function(expr) { 
    if (xw.EL.isExpression(expr)) {
      var m = expr.match(xw.EL.regex());
      return m.length >= 1 && m[0] != expr;
    }
    return false;
  },
  registerResolver: function(resolver) {
    xw.EL.resolvers.push(resolver);
  },
  // A helper method that creates a single-value resolver
  setValue: function(expr, value) {
    xw.EL.registerResolver({
      canResolve: function(p1) {
        return expr == p1;
      },
      resolve: function(p1) {
        return expr == p1 ? value : undefined;
      }
    });
  },
  unregisterResolver: function(resolver) {
    for (var i = xw.EL.resolvers.length - 1; i >= 0; i--) {
      if (xw.EL.resolvers[i] == resolver) {
        xw.EL.resolvers.splice(i, 1);
        break;
      }
    }
  },
  destroyViewBindings: function(view) {
    for (var i = xw.EL.bindings.length - 1; i >= 0; i--) {
      if (xw.EL.bindings[i].widget.view == view) {
        xw.EL.bindings.splice(i, 1);
      }
    }
  },
  //
  // Invoked by an EL resolver when its value changes.  The resolver will invoke this
  // method with the rootName parameter containing the name of the root of the EL expression.
  // Any bindings that have the same root name will be evaluated.
  //
  notify: function(rootName) {
    for (var i = 0; i < xw.EL.bindings.length; i++) { 
      var binding = xw.EL.bindings[i];
      var match = false;
      
      if (binding.interpolated) {
        for (var j = 0; j < binding.expressions.length; j++) {
          if (xw.EL.rootName(binding.expressions[j]) == rootName) {
            binding.value = xw.EL.interpolate(binding.widget, binding.expression);
            match = true;
            break;
          }
        }
      } else if (xw.EL.rootName(binding.expression) == rootName) {    
        binding.value = xw.EL.eval(binding.widget, binding.expression);
        match = true;
      }
      
      if (match) {
        if (binding.propertyName) {
          xw.Sys.setObjectProperty(binding.widget, binding.propertyName, binding.value);    
        } else if (binding.callback) {
          binding.callback(binding.value);
        }
      }
    }
  },
  // Creates a new EL binding for a widget, to notify that widget when the EL value changes
  // Params:
  //   widget - the widget to bind to (must not be null)
  //   receiver - either a property name of the widget, or a callback function
  //   expr - the EL expression, either a single value binding expression (e.g. "#{foo}")
  //          or an interpolated expression (e.g. "#{foo}/#{bar}")
  createBinding: function(widget, receiver, expr) {
    var binding = {widget: widget,expression: expr};
    binding.interpolated = xw.EL.isInterpolatedExpression(expr);
   
    if (typeof receiver == "string") {
      binding.propertyName = receiver;
    } else {
      binding.callback = receiver;
    }
    
    if (binding.interpolated) {
      binding.expressions = expr.match(xw.EL.regex());  
    }
    
    xw.EL.bindings.push(binding);
    
    if (binding.interpolated) {
      return xw.EL.interpolate(widget, expr);
    } else {
      return xw.EL.eval(widget, expr);
    }
  },
  clearWidgetBindings: function(widget) {
    for (var i = xw.EL.bindings.length - 1; i >= 0; i--) {
      if (xw.EL.bindings[i].widget == widget) {
        xw.EL.bindings.splice(i, 1);
      }
    }
  },
  eval: function(widget, expr) {
    var e = xw.EL.regex(expr);
    if (e === null) {
      throw "Error evaluating EL - [" + expr + "] is an invalid expression.";
    }

    var invert = e[1] === "!";
    var parts = e[2].split(".");
    var root = null;
          
    // First we walk up the component tree to see if the variable can be resolved within the widget's hierarchy
    var w = widget;
    while (w != null && !(w instanceof xw.View)) {
      if (xw.Sys.isDefined(w.resolve) && (typeof w.resolve == "function")) {
        var v = w.resolve(parts[0]);
        if (v != undefined) {
          root = v;
          break;
        }
      }
      w = w.parent;    
    } 
    
    if (root === null) {
      var w = widget.getOwner()._registeredWidgets[parts[0]];

      // Next we check if there are any named widgets within the same view that match        
      if (xw.Sys.isDefined(w)) {  
        root = w;
      // Last, we check all of the registered EL resolvers
      } else {
        for (var i = 0; i < xw.EL.resolvers.length; i++) {    
          if (xw.EL.resolvers[i].canResolve(parts[0])) {
            root = xw.EL.resolvers[i].resolve(parts[0]);
            break;
          }
        }
      }
    }
    
    // Lastly we check any data modules
    if (root === null) {
      for (var i = 0; i < xw.Controller.activeDataModules.length; i++) {
        var dm = xw.Controller.activeDataModules[i];
        var w = dm._registeredWidgets[parts[0]];
        if (xw.Sys.isDefined(w)) {
          root = w;
          break;
        }
      }
    }
    
    if (root === null) {
      return undefined;
    }
    
    var value = root;
    for (var i = 1; i < parts.length; i++) {
      value = value[parts[i]];
    }
    return invert ? !value : value;  
  },
  rootName: function(expr) {
    return xw.EL.regex(expr)[2].split(".")[0];
  },
  interpolate: function(widget, text) {
    var replaced = text;
    
    if (xw.Sys.isDefined(replaced) && replaced !== null) {
      var expressions = text.match(xw.EL.regex());
      if (expressions != null) {
        for (var i = 0; i < expressions.length; i++) {
          var val = xw.EL.eval(widget, expressions[i]);
          if (xw.Sys.isUndefined(val)) {
            val = "undefined"; 
          } else if (val === null) {
            val = "null";
          }
          replaced = replaced.replace(expressions[i], val);
        }
      }
    }
    return replaced;
  }
};

//
// Event bus
//
xw.Event = {
  observers: {},
  registerObserver: function(event, observer) {  
    if (xw.Sys.isUndefined(observer.fire) || (typeof observer.fire !== "function")) {
      alert("Error - could not register event observer [" + observer + "] for event [" + event + "] - " +
        "observer does not define a fire() method");
    }

    if (xw.Sys.isUndefined(xw.Event.observers[event])) {
      xw.Event.observers[event] = [];
    }
    xw.Event.observers[event].push(observer);
  },
  unregisterObserver: function(observer) {
    var check = function(val) { return val == observer; };
    for (var event in xw.Event.observers) {
      xw.Sys.deleteArrayElements(xw.Event.observers[event], check);
    }
  },
  fire: function(event, params) {
    if (xw.Sys.isDefined(xw.Event.observers[event])) {
      for (var i = 0; i < xw.Event.observers[event].length; i++) {
        xw.Event.observers[event][i].fire(params);
      }
    }
  }
};

//
// Ajax support
//

xw.Ajax = {
  createRequestObject: function(callback, xml) {
    var r;
    if (window.XMLHttpRequest) {
      r = new XMLHttpRequest();
    } else {
      r = new ActiveXObject("Microsoft.XMLHTTP");
    }
    r.onreadystatechange = function() {
      if (r.readyState == 4) {
        if (r.status == 200) {
          // Done to avoid a memory leak
          window.setTimeout(function() {
            r.onreadystatechange = function() {};
          }, 0);
          if (callback) {
            if (xml) {
              try {
                r.responseXML.documentElement;
                callback(r.responseXML);
              } catch (ex) {
                try {
                  var doc = new ActiveXObject("Microsoft.XMLDOM");
                  doc.async = "false";
                  doc.loadXML(r.responseText);
                  callback(doc);
                } catch (e) {
                  var p = new DOMParser();
                  callback(parser.parseFromString(r.responseText, "text/xml"));
                }
              }
            } else {
              callback(r.responseText);
            }
          }
        }
      }
    }
    return r;
  },
  get: function(path, callback) {
    var r = xw.Ajax.createRequestObject(callback);
    r.open("GET", path, true);
    r.send();
  },
  getXml: function(path, callback) {
    var r = xw.Ajax.createRequestObject(callback, true);
    r.open("GET", path, true);
    r.send();
  },
  postXml: function(path, content, callback) {
    var r = xw.Ajax.createRequestObject(callback, true);
    r.open("POST", path, true);
    r.send(content);
  }
};

//
// A Map implementation
//
xw.Map = function() {
  this.elements = [];

  xw.Map.prototype.size = function() {
    return this.elements.length;
  };

  xw.Map.prototype.isEmpty = function() {
    return this.elements.length === 0;
  };

  xw.Map.prototype.keySet = function() {
    var i;
    var keySet = [];
    for (i = 0; i < this.elements.length; i++) {
      keySet.push(this.elements[i].key);
    }
    return keySet;
  };

  xw.Map.prototype.values = function() {
    var i;
    var values = [];
    for (i = 0; i < this.elements.length; i++) {
      values.push(this.elements[i].value);
    }
    return values;
  };

  xw.Map.prototype.get = function(key) {
    var i;
    for (i = 0; i < this.elements.length; i++) {
      if (this.elements[i].key === key) {
        return this.elements[i].value;
      }
    }
    return null;
  };

  xw.Map.prototype.put = function(key, value) {
    var i;
    for (i = 0; i < this.elements.length; i++) {
      if (this.elements[i].key === key) {
        this.elements[i].value = value;
        return;
      }
    }
    this.elements.push({key:key,value:value});
  };

  xw.Map.prototype.remove = function(key) {
    var i;
    for (i = 0; i < this.elements.length; i++) {
      if (this.elements[i].key === key) {
        this.elements.splice(i, 1);
      }
    }
  };

  xw.Map.prototype.contains = function(key) {
    var i;
    for (i = 0; i < this.elements.length; i++) {
      if (this.elements[i].key === key) {
        return true;
      }
    }
    return false;
  };
};

xw.ViewNode = function(children) {
  this.children = children;
};

xw.DataModuleNode = function(children) {
  this.children = children;
};

//
// Contains metadata about a view node that represents an event
//
xw.EventNode = function(type, script) {
  this.type = type;
  this.script = script;
};

//
// Contains metadata about a view node that represents a widget
//
xw.WidgetNode = function(fqwn, attributes, children) {
  this.fqwn = fqwn;
  this.attributes = attributes;
  this.children = children;
};

//
// Contains metadata about a view node that represents a native html control
//
xw.XHtmlNode = function(tagName, attributes, children) {
  this.tagName = tagName;
  this.attributes = attributes;
  this.children = children;
};

xw.TextNode = function(attributes) {
  this.attributes = attributes;
  this.escape = true;
}

//
// Parses an XML-based definition and returns the root node
//
xw.DefinitionParser = function() {};

xw.DefinitionParser.prototype.parse = function(rootNode) {
  if (rootNode.namespaceURI === xw.CORE_NAMESPACE && rootNode.localName === "view") {
    return new xw.ViewNode(this.parseChildNodes(rootNode.childNodes));
  } else if (rootNode.namespaceURI === xw.CORE_NAMESPACE && rootNode.localName === "dataModule") {
    return new xw.DataModuleNode(this.parseChildNodes(rootNode.childNodes));
  } else {
    alert("Invalid resource definition - document root '" + rootNode.tagName +
      "' must be a 'view' or 'dataModule' element in namespace " + xw.CORE_NAMESPACE);  
  }
};

xw.DefinitionParser.prototype.parseUri = function(uri) {
  var i;
  var partNames = ["source","protocol","authority","domain","port","path","directoryPath","fileName","query","anchor"];
  var parts = new RegExp("^(?:([^:/?#.]+):)?(?://)?(([^:/?#]*)(?::(\\d*))?)?((/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[\\?#]|$)))*/?)?([^?#/]*))?(?:\\?([^#]*))?(?:#(.*))?").exec(uri);
  var result = {};

  for (i = 0; i < 10; i++) {
    result[partNames[i]] = (parts[i] ? parts[i] : "");
  }

  if (result.directoryPath.length > 0) {
    result.directoryPath = result.directoryPath.replace(/\/?$/, "/");
  }

  return result;
};

xw.DefinitionParser.prototype.getFQCN = function(e) {
  var uri = this.parseUri(e.namespaceURI);
  var i;
  var fp = "";
  var parts = uri.domain.split(".");
  for (i = parts.length - 1; i >=0; i--) {
    fp += parts[i];
    if (i > 0) {
      fp += "/";
    }
  }
  fp += uri.directoryPath + xw.Sys.capitalize(e.localName);
  return fp.replace(/\//g, ".");
};

//
// Convenience method, parses the attributes of an XML element
// and returns their values in an associative array
//
xw.DefinitionParser.prototype.getElementAttributes = function(e) {
  var attribs = {};
  var i, n;    
  for (i = 0; i < e.attributes.length; i++) {
     n = e.attributes[i].name;
     attribs[n] = e.getAttribute(n);
  }     
  return attribs;
}

//
// Converts XML into a definition
//  
xw.DefinitionParser.prototype.parseChildNodes = function(children) {
  var nodes = [];
  var i, j;

  for (i = 0; i < children.length; i++) {
    var e = children.item(i);

    if (e.namespaceURI === xw.XHTML_NAMESPACE) {
      nodes.push(new xw.XHtmlNode(e.localName, this.getElementAttributes(e), this.parseChildNodes(e.childNodes)));
    }
    else {
      // Process elements here
      if (e.nodeType === 1) {  
        if (e.namespaceURI === xw.CORE_NAMESPACE && e.localName === "event") {
          var event = this.parseEvent(e);
          if (event) {              
            nodes.push(event);
          }
        } else if (e.namespaceURI === xw.CORE_NAMESPACE && e.localName === "text") {
          var tn = new xw.TextNode(this.getElementAttributes(e));
          tn.escape = (e.getAttribute("escape") !== "false");
          nodes.push(tn);
        } else {
          nodes.push(new xw.WidgetNode(this.getFQCN(e), this.getElementAttributes(e), this.parseChildNodes(e.childNodes)));
        }          
      // Process text nodes here
      } else if (e.nodeType === 3) {
        var value = xw.Sys.trim(e.nodeValue);
        if (value.length > 0) {
          // We don't want to trim the actual value, as it may contain important space
          nodes.push(new xw.TextNode({value:e.nodeValue}));
        }
      }
    }
  }
  return nodes;
};

//
// Parses an XML element that contains an event definition and extracts the event type and script
// which are then returned as an EventNode instance.
xw.DefinitionParser.prototype.parseEvent = function(e) {
  var i, j, script;
  var eventType = e.getAttribute("type");
  for (i = 0; i < e.childNodes.length; i++) {
    var child = e.childNodes.item(i);

    if (child.nodeType === 1 && 
        child.namespaceURI === xw.CORE_NAMESPACE && 
        child.localName === "action" && 
        child.getAttribute("type") === "script") {
      // get all the text content of the action node, textContent would be easier but IE doesn't support that
      script = "";
      for (j = 0; j < child.childNodes.length; j++) {
        var grandChild = child.childNodes[j];
        var nodeType = grandChild.nodeType;

        // not TEXT or CDATA
        if (nodeType === 3 || nodeType === 4) {
          script += grandChild.nodeValue;
        }
      }
      return new xw.EventNode(eventType, script);
    }
  }
};

xw.Controller = {};

//
// A cache of resource name:root definition node values
//
xw.Controller.resourceDefs = {};

xw.Controller.activeViews = [];

xw.Controller.activeDataModules = [];

// A queue of resources to be opened
xw.Controller.queue = [];

// Queued item states
xw.Controller.QUEUE_STATUS_UNPROCESSED = 1;
xw.Controller.QUEUE_STATUS_DEFINITION_LOADING = 2;
xw.Controller.QUEUE_STATUS_DEFINITION_LOADED = 3;
xw.Controller.QUEUE_STATUS_WIDGETS_LOADING = 4;
xw.Controller.QUEUE_STATUS_WIDGETS_LOADED = 5;
xw.Controller.QUEUE_STATUS_PROCESSED = 6;

// 
// Opens a resource, such as a view or data module
//
xw.Controller.open = function(resource, params, container) {
  xw.Controller.queue.push({
    resource: resource, 
    params: params, 
    container: container, 
    status: xw.Controller.QUEUE_STATUS_UNPROCESSED
  });
  xw.Controller.processQueue();
};

xw.Controller.processQueue = function() {
  for (var i = 0; i < xw.Controller.queue.length; i++) {
    var item = xw.Controller.queue[i];
    
    if (item.status === xw.Controller.QUEUE_STATUS_UNPROCESSED ||
        item.status === xw.Controller.QUEUE_STATUS_DEFINITION_LOADING) {
      // If the resource is known, update its status
      if (xw.Sys.isDefined(xw.Controller.resourceDefs[item.resource])) {
        item.status = xw.Controller.QUEUE_STATUS_DEFINITION_LOADED;    
      } else if (item.status === xw.Controller.QUEUE_STATUS_UNPROCESSED) {
        // Otherwise load the resource
        
        // FIXME we should really double check that the resource isn't being loaded elsewhere, 
        // like another queue item (however unlikely that might be)
        item.status = xw.Controller.QUEUE_STATUS_DEFINITION_LOADING;
        xw.Controller.loadResource(item.resource);
      }    
    }
    
    if (item.status === xw.Controller.QUEUE_STATUS_DEFINITION_LOADED) {
      // Validate all of the widgets used by the resource    
      var invalid = xw.Controller.validateWidgets(xw.Controller.resourceDefs[item.resource].children, []);
      if (invalid.length > 0) {
        // If there are invalid widgets, load them
        item.status = xw.Controller.QUEUE_STATUS_WIDGETS_LOADING;
        item.invalid = invalid;
        
        for (var j = 0; j < invalid.length; j++) {
          if (xw.WidgetManager.getWidgetState(invalid[j]) === xw.WidgetManager.WS_FAILED) {
            item.status = xw.Controller.QUEUE_STATUS_PROCESSED;
            alert("Could not open resource [" + item.resource + "], as widget [" + invalid[j] + "] failed to load.");
            break;
          }        
        }      
        
        xw.WidgetManager.loadWidgets(invalid);
      } else {
        item.status = xw.Controller.QUEUE_STATUS_WIDGETS_LOADED;
      }
    }
    
    if (item.status === xw.Controller.QUEUE_STATUS_WIDGETS_LOADING) {
      // Check if the widgets are loaded
      var loaded = true;
      
      for (var j = 0; j < item.invalid.length; j++) {
        var state = xw.WidgetManager.getWidgetState(item.invalid[j]);
        if (state === xw.WidgetManager.WS_FAILED) {
          item.status = xw.Controller.QUEUE_STATUS_PROCESSED;
          alert("Could not open resource [" + item.resource + "], as widget [" + item.invalid[j] + "] failed to load.");
          break;
        } else if (state !== xw.WidgetManager.WS_LOADED) {
          loaded = false;
          break;
        }
      }    
      
      if (loaded) {
        item.status = xw.Controller.QUEUE_STATUS_WIDGETS_LOADED;
      }
    }
    
    if (item.status === xw.Controller.QUEUE_STATUS_WIDGETS_LOADED) {          
      var def = xw.Controller.resourceDefs[item.resource];
      item.status = xw.Controller.QUEUE_STATUS_PROCESSED;
      
      var params = (xw.Sys.isDefined(item.params) && item.params !== null) ? item.params : {};
      
      if (def instanceof xw.ViewNode) {
        xw.Controller.openView(item.resource, def, params, item.container);
      } else if (def instanceof xw.DataModuleNode) {
        xw.Controller.openDataModule(item.resource, def, params);
      }    
    }
  }  

  // Remove processed items from the queue  
  for (var i = xw.Controller.queue.length - 1; i >= 0; i--) {
    var item = xw.Controller.queue[i];
    if (item.status === xw.Controller.QUEUE_STATUS_PROCESSED) {
      xw.Controller.queue.splice(i,1);
    }
  }
};

//
// Validate that the widgets used in the specified view are all loaded
//
xw.Controller.validateWidgets = function(children, invalid) {
  var i, fqwn;  
  for (i = 0; i < children.length; i++) {
     if (children[i] instanceof xw.WidgetNode) {
       fqwn = children[i].fqwn;
       if (!xw.Sys.classExists(fqwn)) {         
         if (!xw.Sys.arrayContains(invalid, fqwn)) {
           invalid.push(fqwn);
         }
       }
     }
     if (xw.Sys.isDefined(children[i].children)) {
       xw.Controller.validateWidgets(children[i].children, invalid);
     }
  }
  return invalid;
};

//
// Loads the view definition from the server
//
xw.Controller.loadResource = function(resource) {
  var req = xw.Sys.createHttpRequest("text/xml");
  req.onreadystatechange = function() { xw.Controller.loadResourceCallback(req, resource) };
  req.open("GET", resource, true);
  req.send(null);
  return req;
};

xw.Controller.loadResourceCallback = function(req, resource) {
  if (req.readyState === 4) {
    if (req.status === 200 || req.status === 0) {
      var rootNode;
      if (req.responseXml) rootNode = req.responseXML.documentElement;
      else if (req.responseText && req.responseText.length > 0) {
        rootNode = xw.Sys.parseXml(req.responseText).documentElement;
      }

      if (rootNode) {         
        // Parse the XML resource definition and store it in the resource definition cache
        xw.Controller.resourceDefs[resource] = new xw.DefinitionParser().parse(rootNode);
        xw.Controller.processQueue();
      }
      else {
        alert("Resource [" + resource + "] could not be loaded..  If you are attempting to load " +
              "from the local file system, the security model of some browsers (such as Chrome) " +
              "might not support this.");
      }
    }
    else {
      alert("There was an error when trying to load resource [" + resource + "] - Error code: " + req.status);
    }
  };
};

xw.Controller.openView = function(viewName, definition, params, c) {
  // Determine the container control 
  var container = ("string" === (typeof c)) ? xw.Sys.getObject(c) : c;
  
  if (container == null) {
    alert("Error opening view - container [" + c + "] not found.");
    return;
  } 

  // If the container already contains a view, destroy it
  for (var i = 0; i < xw.Controller.activeViews.length; i++) {
    var entry = xw.Controller.activeViews[i];
    if (entry.container == container) {
      entry.view.destroy();
      xw.Controller.activeViews.splice(i, 1);
      break;
    }
  }
  
  // If anything else is remaining, clear it
  xw.Sys.clearChildren(container);
    
  var view = new xw.View();
  view.viewName = viewName;
  view.params = params;
  xw.Controller.parseChildren(view, definition.children, view);
  xw.Controller.activeViews.push({container: container, view: view});
  view.render(container);
};

xw.Controller.openDataModule = function(dataModule, definition, params) {
  var dm = new xw.DataModule();
  dm.dataModule = dataModule;
  dm.params = params;
  xw.Controller.parseChildren(dm, definition.children, dm);
  xw.Controller.activeDataModules.push(dm);
  if (typeof dm.open == "function") {
    dm.open();
  }
};

//
// This recursive function does the work of converting the view definition into
// actual widget instances
//
xw.Controller.parseChildren = function(owner, childNodes, parentWidget) {
  var i, widget;
  var widgets = [];
  for (i = 0; i < childNodes.length; i++) {
    var c = childNodes[i];
    if (c instanceof xw.WidgetNode) {
      
      // Create an instance of the widget and set its parent and view
      widget = xw.Sys.newInstance(c.fqwn);
      widget.setParent(parentWidget);
      widget.setOwner(owner);      
      
      // Set the widget's attributes
      for (var p in c.attributes) {       
          xw.Sys.setObjectProperty(widget, p, c.attributes[p]);
      }
      
      widgets.push(widget);
      
      // If this node has children, parse them also
      if (xw.Sys.isDefined(c.children) && c.children.length > 0) {
        xw.Controller.parseChildren(owner, c.children, widget);
      }
    } else if (c instanceof xw.EventNode) {      
      var action = new xw.Action();
      action.script = c.script;
      action.setOwner(owner);      
      parentWidget[c.type] = action;
    } else if (c instanceof xw.XHtmlNode) {
      widget = new xw.XHtml();      
      widget.setParent(parentWidget);
      widget.setOwner(owner);
      widget.tagName = c.tagName;
      widget.attributes = c.attributes;
      widgets.push(widget);
      if (xw.Sys.isDefined(c.children) && c.children.length > 0) {
        xw.Controller.parseChildren(owner, c.children, widget); 
      }
    } else if (c instanceof xw.TextNode) {
      widget = new xw.Text();
      widget.setParent(parentWidget);
      widget.setOwner(owner);      
      widget.escape = c.escape;
      
      // Set the widget's attributes
      for (var p in c.attributes) { 
        if (xw.EL.isExpression(c.attributes[p])) {
          xw.Sys.setObjectProperty(widget, p, c.attributes[p]);
        }
      }
            
      widgets.push(widget);
    }
  }
    
  if (widgets.length > 0) {
    parentWidget.children = widgets;    
  }
};

//
// This class is responsible for loading the source code for widgets that have not been loaded already
//
xw.WidgetManager = {};

xw.WidgetManager.WS_QUEUED = "QUEUED";
xw.WidgetManager.WS_LOADING = "LOADING";
xw.WidgetManager.WS_LOADED = "LOADED";
xw.WidgetManager.WS_FAILED = "FAILED";

//
// Stores the current widget load state
//
xw.WidgetManager.widgetState = {};

xw.WidgetManager.getWidgetState = function(fqwn) {
  return xw.WidgetManager.widgetState[fqwn];
};

xw.WidgetManager.setWidgetState = function(fqwn, state) {
  xw.WidgetManager.widgetState[fqwn] = state;
};

//
// Load the widgets specified in the widgets array parameter, then open the specified view in
// the specified container 
//
xw.WidgetManager.loadWidgets = function(widgets) {
  var i;
  var wm = xw.WidgetManager;
  
  var queued = false;
  
  for (i = 0; i < widgets.length; i++) {
    if (xw.Sys.isUndefined(wm.getWidgetState(widgets[i]))) {
      wm.setWidgetState(widgets[i], wm.WS_QUEUED);
      queued = true;
    } 
  }
  
  // If there are any queued widgets that have not yet been loaded, load them
  // otherwise pass control back to the controller
  if (queued) {
    wm.loadQueuedWidgets();
  } else {
    xw.Controller.processQueue();
  }
};

xw.WidgetManager.loadQueuedWidgets = function() {
  var wm = xw.WidgetManager;
  
  for (var fqwn in wm.widgetState) {
    var state = wm.getWidgetState(fqwn);
    
    if (state === wm.WS_QUEUED) {
      // Last check to see if the class exists before we try loading it
      if (!xw.Sys.classExists(fqwn)) {
        // Set the widget state to LOADING
        wm.setWidgetState(fqwn, wm.WS_LOADING);
        
        // Define callback methods for success and failure
        var successCallback = function() {
          wm.setWidgetState(fqwn, wm.WS_LOADED);
          wm.loadQueuedWidgets();
        };
        
        var failureCallback = function() {
          wm.setWidgetState(fqwn, wm.WS_FAILED);
          wm.loadQueuedWidgets();
        };
        
        var url = xw.Sys.getBasePath() + fqwn.replace(/\./g, "/").toLowerCase() + ".js";    
        xw.Sys.loadSource(url, successCallback, failureCallback);
        return;      
      } else {
        wm.setWidgetState(fqwn, wm.WS_LOADED);
      }
    }  
  }
    
  xw.Controller.processQueue();
};
  
//
// LAYOUT MANAGERS
//

xw.BorderLayout = function() {
  this.bounds = new xw.Map();

  xw.BorderLayout.prototype.calculateLayout = function(widgets) {
    var i;
    var controls = {      
      top: [],
      bottom: [],
      left: [],
      right: [],
      client: [] 
    };
    var spacing = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };

    // TODO - support percentage widths

//    container.style.position = "relative";
    
//    xw.Sys.getStyle(container, "position")

    for (i = 0; i < widgets.length; i++) {
      var w = widgets[i];
      if (controls[w.align]) {
        controls[w.align].push(w);
      }
    }

    for (i = 0; i < controls.top.length; i++) {
      var bounds = new xw.Bounds(null, null, controls.top[i].height, null)
        .addStyleProperty("position", "absolute")
        .addStyleProperty("top", spacing.top + "px")
        .addStyleProperty("left", "0")
        .addStyleProperty("right", "0");

      this.bounds.put(controls.top[i], bounds);
      spacing.top += 1.0 * controls.top[i].height;
    }

    for (i = 0; i < controls.bottom.length; i++) {
      var bounds = new xw.Bounds(null, null, controls.bottom[i].height, null)
        .addStyleProperty("position","absolute")
        .addStyleProperty("bottom", spacing.bottom)
        .addStyleProperty("left", "0")
        .addStyleProperty("right", "0");

      this.bounds.put(controls.bottom[i], bounds);
      spacing.bottom += 1.0 * controls.bottom[i].height;
    }

    for (i = 0; i < controls.left.length; i++) {
      this.bounds.put(controls.left[i], new xw.Bounds(null, null, null, controls.left[i].width)
        .addStyleProperty("position", "absolute")
        .addStyleProperty("left", spacing.left + "px")
        .addStyleProperty("top", spacing.top + "px")
        .addStyleProperty("bottom", spacing.bottom + "px")
      );
      spacing.left += 1.0 * controls.left[i].width;
    }

    for (i = 0; i < controls.right.length; i++) {
      this.bounds.put(controls.right[i], new xw.Bounds(null, null, null, controls.right[i].width)
        .addStyleProperty("position", "absolute")
        .addStyleProperty("right", spacing.right + "px")
        .addStyleProperty("top", spacing.top + "px")
        .addStyleProperty("bottom", spacing.bottom + "px")
      );
      spacing.right += 1.0 * controls.right[i].width;
    }

    for (i = 0; i < controls.client.length; i++) {
      this.bounds.put(controls.client[i], new xw.Bounds(null, null, null, null)
        .addStyleProperty("position", "absolute")
        .addStyleProperty("left", spacing.left + "px")
        .addStyleProperty("right", spacing.right + "px")
        .addStyleProperty("top", spacing.top + "px")
        .addStyleProperty("bottom", spacing.bottom + "px")
      );
    }
  };

  xw.BorderLayout.prototype.getBounds = function(ctl) {
    return this.bounds.get(ctl);
  };
};

//
// Defines the physical bounds of a control
//
xw.Bounds = function(top, left, height, width) {
  this.top = top;
  this.left = left;
  this.height = height;
  this.width = width;
  this.style = new Object();
  
  xw.Bounds.prototype.getTop = function() {
    return this.top;
  };
  
  xw.Bounds.prototype.getLeft = function() {
    return this.left;
  };
  
  xw.Bounds.prototype.getHeight = function() {
    return this.height;
  };
  
  xw.Bounds.prototype.getWidth = function() {
    return this.width;
  };
  
  xw.Bounds.prototype.addStyleProperty = function(property, value) {
    this.style[property] = value;
    return this;
  };
};

xw.Action = function() {
  this.script = null;
};

xw.Action.prototype.invoke = function() {
  if (xw.Sys.isDefined(this.script)) {
    // The script must have access to named widgets (widgets with an id)
    // to do this, we inject some additional lines into the front of the 
    // script.
  
    var __script = "{";

    // local variable, visible to our evaluated script -
    // required to set up script variables     
    var __registered = {};
    
    // local variable, visible to our evaluated script -
    // makes the view or data module params available
    var params = this.getOwner().params;
    
    // register variables for all widgets within the same view/data module with an id
    for (var id in this.getOwner()._registeredWidgets) {
      __registered[id] = this.getOwner()._registeredWidgets[id];
      __script += "var " + id + " = __registered[\"" + id + "\"];";
    }

    // register variables for all widgets with an id from any data modules, if there
    // is no local overriding variable
    for (var i = 0; i < xw.Controller.activeDataModules.length; i++) {
      var dm = xw.Controller.activeDataModules[i];
            
      for (var id in dm._registeredWidgets) {
        if (xw.Sys.isUndefined(__registered[id])) {
          __registered[id] = dm._registeredWidgets[id];
          __script += "var " + id + " = __registered[\"" + id + "\"];";
        }
      }    
    }
       
    __script += this.script;
    __script += "}";    
    
    return eval(__script);
  }
};

xw.Action.prototype.setOwner = function(owner) {
  if (owner instanceof xw.View) {
    this.view = owner;
  } else if (owner instanceof xw.DataModule) {
    this.dataModule = owner;
  }
};

xw.Action.prototype.getOwner = function() {
  if (xw.Sys.isDefined(this.view)) {
    return this.view;
  } else if (xw.Sys.isDefined(this.dataModule)) {
    return this.dataModule;
  }
};

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 * - Adapted from http://ejohn.org/blog/simple-javascript-inheritance/
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  xw.Class = function(){}; 
  xw.Class.extend = function(prop) {
    var _super = this.prototype;
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    for (var name in prop) {
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
            this._super = _super[name];
            var ret = fn.apply(this, arguments);        
            this._super = tmp;           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    function Class() {
      if (!initializing && this._constructor)
        this._constructor.apply(this, arguments);
    }   
    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.extend = arguments.callee;  
    return Class;
  };
})();

//
// Base class for widgets
//
xw.Widget = xw.Class.extend({
  _constructor: function() {
    this.parent = null;
    this.children = [];  
    
    // Every widget implementation must provide a property that contains the
    // fully qualified widget name
    this._className = null;
  },
  getId: function() {
    return this.id;
  },
  setId: function(id) {
    // register the id of this widget with the owning view.
    if (xw.Sys.isDefined(this.id)) {
      this.getOwner().unregisterWidget(this);
      this.id = null;
    } else {
      this.id = id;
      this.getOwner().registerWidget(this);  
    }
  },
  getOwner: function() {
    if (xw.Sys.isDefined(this.view)) {
      return this.view;
    } else if (xw.Sys.isDefined(this.dataModule)) {
      return this.dataModule;
    }
  },
  setOwner: function(owner) {
    if (owner instanceof xw.View) {
      this.view = owner;
    } else if (owner instanceof xw.DataModule) {
      this.dataModule = owner;
    }
  },
  setParent: function(parent) {
    this.parent = parent;
  },
  registerProperty: function(name, options) {
    if (xw.Sys.isUndefined(name)) {
      throw "No name specified for registered property on object [" + this.toString() + "]";
    }
    
    if (xw.Sys.isUndefined(this._registeredProperties)) {
      // register the id property
      this._registeredProperties = {id: undefined};    
    }

    if (xw.Sys.isDefined(this._registeredProperties[name])) {
      throw "Property [" + name + "] already registered for object [" + this.toString() + "]";
    }
    
    this._registeredProperties[name] = options;

    var that = this;
    var watcher = function(prop, oldVal, newVal) {
      if (xw.EL.isExpression(oldVal)) {    
        xw.EL.clearWidgetBindings(that);
      }
      if (xw.EL.isExpression(newVal)) {
        var p = that._registeredProperties[prop];
        if (xw.Sys.isDefined(p) &&
            xw.Sys.isDefined(p.elListener)) {
             return xw.EL.createBinding(that, p.elListener, newVal);
        } else {
          if (xw.EL.isValueExpression(newVal)) {
            return xw.EL.eval(this, newVal);
          } else if (xw.EL.isInterpolatedExpression(newVal)) {
            return xw.EL.interpolate(this, newVal);
          }
        }
      }    
      return newVal;
    };
    
    this.watch(name, watcher);
    
    if (xw.Sys.isDefined(options) && options != null) {
      if (xw.Sys.isDefined(options.default)) {
        this[name] = options.default;
      }  
    }
  },
  addEvent: function(control, eventName, event) {     
    if (xw.Sys.isDefined(this["on" + eventName]) && xw.Sys.isDefined(event)) {        
      var sender = this;
      var action = function() {
        event.invoke(sender);
      };
      xw.Sys.chainEvent(control, eventName, action);
    }
  },
  registerEvent: function(eventName) {
    if (xw.Sys.isUndefined(this._registeredEvents)) {
      // metadata containing the known events for this widget
      this._registeredEvents = [];        
    }
    if (!xw.Sys.arrayContains(this._registeredEvents, eventName)) {
      this._registeredEvents.push(eventName);
    }
  },
  destroy: function() {
    // NO-OP
  },
    // Makes a cloned copy of the widget.  Any properties that contain
    // references to other widgets will not be cloned, they will just be
    // updated with a reference to that widget
  clone: function(parent) {
    var o = xw.Sys.newInstance(this._className);

    // Clone the registered properties only
    for (var i = 0; i < this._registeredProperties.length; i++) {
      var p = this._registeredProperties[i];
      if (this[p] instanceof xw.Widget) {
        o[p] = this[p];
      } else {
        o[p] = xw.Sys.cloneObject(this[p]);
      }    
    }
    
    // Set the parent and clone the children
    o.parent = xw.Sys.isUndefined(parent) ? this.parent : parent;
    for (var i = 0; i < this.children.length; i++) {
      o.children.push(this.children[i].clone(o));
    }   
    return o;
  },
  toString: function() {
    return "xw.Widget[" + this.id + "]";
  }
});

xw.Visual = xw.Widget.extend({
  _constructor: function() {
    this._super(false);
  },
  renderChildren: function(container) {
    var i;
    for (i = 0; i < this.children.length; i++) {
      if (this.children[i] instanceof xw.Visual) {  
        if (xw.Sys.isUndefined(this.children[i].render)) {
          throw "Error - widget [" + this.children[i] + "] extending xw.Visual does not provide a render() method";
        } else {
          this.children[i].render(container);       
        }
      } else if (this.children[i] instanceof xw.NonVisual) {     
        if (typeof this.children[i].open == "function") {
          this.children[i].open();
        }
      } else {
        throw "Error - unrecognized widget type [" + this.children[i] + "] encountered in view definition";
      }
    }
  }
});

xw.NonVisual = xw.Widget.extend({
  _constructor: function() {
    this._super(false);
  },
  openChildren: function(container) {
    var i;
    for (i = 0; i < this.children.length; i++) {
      if (this.children[i] instanceof xw.Visual) {  
        throw "Error - widget extending xw.Visual may not be a child of a widget extending xw.NonVisual";
      } else if (this.children[i] instanceof xw.NonVisual) {   
        if (typeof this.children[i].open == "function") {   
          this.children[i].open();
        }
      } else {
        throw "Error - unrecognized widget type [" + this.children[i] + "] encountered in view definition";
      }
    }
  }
});

// Represents an XHTML element
xw.XHtml = xw.Visual.extend({
  _constructor: function() {
    this._super(false);
    this.registerProperty("tagName", null);
    this.registerProperty("attributes", null);
    this.control = null;  
  },
  render: function(container) {
    this.control = document.createElement(this.tagName);
    for (var a in this.attributes) {
      this.setAttribute(a, this.attributes[a]);
    }
    container.appendChild(this.control);
    this.renderChildren(this.control);  
  },
  setAttribute: function(attribName, value) {
    if (attribName == "class") {
      this.control.className = value;
    } else if (attribName == "style") {
      this.control.style.cssText = value;
    } else {
      this.control[attribName] = value;
    }
  },
  toString: function() {
    return "xw.XHtml[" + this.tagName + "]"; 
  }
});

// Represents plain ol' text
xw.Text = xw.Visual.extend({
  _constructor: function() {
    this._super(false);
    delete children;
    var that = this;
    var cb = function(val) {
      that.renderedText = val;
      that.renderText();
    };
    this.registerProperty("value", {elListener: cb});
    this.registerProperty("escape", {default: true});
    this.control = null;  
    this.renderedText = "";  
  },
  render: function(container) {
    this.control = document.createElement("span");
    container.appendChild(this.control);
    this.renderText();  
  },
  renderText: function() {
    if (this.control !== null) {
      var text = (xw.Sys.isDefined(this.renderedText) && this.renderedText !== null) ?
         this.renderedText : "";
      if (this.escape) {
        this.control.innerHTML = text;
      } else {
        if (!xw.Sys.isDefined(this.textNode)) {        
          this.textNode = document.createTextNode();
          this.control.appendChild(this.textNode);
        }
        this.textNode.nodeValue = text;
      }
    }
  },
  toString: function() {
    return "xw.Text[" + this.value + "]";
  }
});

xw.Container = xw.Visual.extend({
  _constructor: function() {
    this._super(false);
    // FIXME hard coded the layout for now
    this.layout = new xw.BorderLayout();  
  },
  setLayout: function(layoutName) { }  
});

//
// A single instance of a view
//
xw.View = xw.Container.extend({
  _constructor: function() {
    this._super(false);
    this.registerProperty("viewName");
    this.registerProperty("params");
    this.registerEvent("afterRender");
    // The container control
    this.container = null;  
    this._registeredWidgets = {};  
    delete this.parent;    
  },
  //
  // Callback for window resize events
  //
  resize: function() {
    // bubble the resize event through the component tree
  },
  render: function(container) {
    this.container = container;

    // Set the window resize callback so that we can respond to resize events
    var target = this;
    var callback = function() { target.resize(); };
    xw.Sys.chainEvent(window, "resize", callback);

    // Create the appropriate layout manager and layout the child controls
    if (this.layout !== null) {
      //this.layoutManager = new xw.BorderLayout();
      this.layout.calculateLayout(this.children);
    }    
    
    this.renderChildren(this.container);
    
    if (xw.Sys.isDefined(this.afterRender)) {
      this.afterRender.invoke();
    }
  },
  appendChild: function(child) {
    this.container.appendChild(child);
  },
  // Registers a named (i.e. having an "id" property) widget
  registerWidget: function(widget) {
    this._registeredWidgets[widget.id] = widget;
  },
  unregisterWidget: function(widget) {
    for (var id in this._registeredWidgets) {
      if (this._registeredWidgets[id] == widget) {
        delete this._registeredWidgets[id];
        break;
      }
    }
  },
  destroy: function() {
    xw.EL.destroyViewBindings(this);

    if (this.container != null) {
      if (xw.Sys.isDefined(this.children)) {
        this.destroyChildren(this.children);
      }
    }
  },
  destroyChildren: function(children) {
    for (var i = 0; i < children.length; i++) {
      if (xw.Sys.isDefined(children[i].children) && children[i].children.length > 0) {
        this.destroyChildren(children[i].children);
      }
      children[i].destroy();
    };
  },
  toString: function() {
    return "xw.View [" + this.viewName + "]";
  }
});

xw.DataModule = xw.NonVisual.extend({
  _constructor: function() {
    this._super(false);
    this.registerProperty("moduleName");
    this.registerProperty("params");
    this.registerEvent("afterOpen");
    this._registeredWidgets = {};  
    delete this.parent;
  },
  open: function() {
    this.openChildren();    
    if (xw.Sys.isDefined(this.afterOpen)) {
      this.afterOpen.invoke();
    }
  },
  // Registers a named (i.e. having an "id" property) widget
  registerWidget: function(widget) {
    this._registeredWidgets[widget.id] = widget;
  },
  unregisterWidget: function(widget) {
    for (var id in this._registeredWidgets) {
      if (this._registeredWidgets[id] == widget) {
        delete this._registeredWidgets[id];
        break;
      }
    }
  },
  toString: function() {
    return "xw.DataModule [" + this.moduleName + "]";
  }
});

//
// GENERAL METHODS
//

// Utility class for creating a modal dialog window
xw.Popup = {
  windowClass: "xwPopupWindow",
  titleClass: "xwPopupTitle",
  closeButtonClass: "xwPopupCloseButton",
  backgroundClass: "xwPopupBackground",
  open: function(viewName, title, width, height) {
    var bg = document.createElement("div");
    bg.style.zIndex = "101";
    bg.style.backgroundColor = "#000000";
    if (xw.Popup.backgroundClass !== null) {
      bg.className = xw.Popup.backgroundClass;
    } 
    
    // Set transparency
    bg.style.filter = "alpha(opacity=25);"  
    bg.style.MozOpacity = ".25";
    bg.style.opacity = ".25";  
    bg.style.position = "fixed";
    bg.style.top = "0px";
    bg.style.left = "0px";
    bg.style.right = "0px";
    bg.style.bottom = "0px";
    
    xw.Popup.background = bg;

    var outer = document.createElement("div");
    outer.style.position = "absolute";
    outer.style.zIndex = 123;
    outer.style.width = (xw.Sys.isUndefined(width) ? "400px" : width + "px");
    outer.style.height = (xw.Sys.isUndefined(height) ? "400px" : height + "px");
    outer.style.left = "0px";
    outer.style.right = "0px";
    outer.style.top = "0px";  
    outer.style.bottom = "0px";
    outer.style.overflow = "hidden";
    outer.style.marginLeft = "auto";
    outer.style.marginRight = "auto";
    outer.style.marginTop = "auto";
    outer.style.marginBottom = "auto";
    outer.style.paddingLeft = "18px";
    outer.style.paddingRight = "30px";
    outer.style.paddingTop = "18px";
    outer.style.paddingBottom = "30px"; 
    xw.Popup.outer = outer;
    
    var inner = document.createElement("div");
    inner.style.position = "relative";
    inner.style.backgroundColor = "#ffffff";  
    inner.style.width = "100%";
    inner.style.height = "100%"; 
    inner.style.boxShadow = "4px 4px 10px 2px #999";
    inner.style.MozBoxShadow = "4px 4px 10px 2px #999";
    inner.style.WebkitBoxShadow = "4px 4px 10px 2px #999";
    inner.style.zIndex = 130; 
    
    if (xw.Popup.windowClass !== null) {
      inner.className = xw.Popup.windowClass;
    }  
    
    outer.appendChild(inner);
    
    var closebtn = document.createElement("div");
    closebtn.className = xw.Popup.closeButtonClass;
    closebtn.onclick = xw.closePopup;
    closebtn.style.zIndex = 150;
    inner.appendChild(closebtn);  
      
    var titleDiv = document.createElement("div");
    titleDiv.appendChild(document.createTextNode(title));
    titleDiv.className = xw.Popup.titleClass;
    inner.appendChild(titleDiv);
    
    var contentDiv = document.createElement("div");
    contentDiv.style.overflowX = "auto";
    contentDiv.style.overflowY = "auto";
    
    inner.appendChild(contentDiv);
    
    xw.open(viewName, null, contentDiv);

    document.body.appendChild(bg);
    document.body.appendChild(outer);
  },
  close: function() {
    if (xw.Popup.outer != null) {
      document.body.removeChild(xw.Popup.outer);
      xw.Popup.outer = null;
    }
    if (xw.Popup.background != null) {
      document.body.removeChild(xw.Popup.background);
      xw.Popup.background = null;
    }
  }
};

//
// Opens a resource (e.g. a view or data module) - this call is asynchronous
//
xw.open = function(viewName, params, container) {
  xw.Controller.open(viewName, params, container);
};
