package("org.xwidgets.core");

org.xwidgets.core.MenuItem = xw.Visual.extend({
  _constructor: function(label) {
    this._super();
    this.registerProperty("label", {default: label});
    this.registerProperty("rendered");
    this.registerProperty("styleClass", {default: "xw_menuitem"});
    this.registerProperty("submenuStyleClass", {default: "xw_submenu"});
    this.registerEvent("onclick");
    this.control = null;
    this.submenuContainer = null;
    this.submenuOpen = false;
  },
  render: function(container) {
    if (this.control == null) {
      this.control = document.createElement("div");
      
      this.control.appendChild(document.createTextNode(this.label === null ? "" : this.label));      
      
      if (this.children.length > 0) {
        var icon = document.createElement("i");
        icon.className ="fa fa-caret-right fa-fw";
        this.control.appendChild(icon);
      }
      
      if (xw.Sys.isDefined(this.styleClass)) {
        this.control.className = this.styleClass;
      }
      container.appendChild(this.control);
      
      var that = this;
      var clickEvent = function(event) {
        that.click(event);
      }
      xw.Sys.chainEvent(this.control, "click", clickEvent);
    }
  },
  click: function(event) {
    if (this.children.length > 0) {
      this.toggleSubmenu();
    } else if (this.onclick) {
      this.onclick(event);
    }
  },
  toggleSubmenu: function() {
    if (this.submenuOpen) {
      this.submenuContainer.style.display = "none";
    } else {
      var c = this.submenuContainer;
      if (c == null) {
        c = document.createElement("div");
        if (xw.Sys.isDefined(this.submenuStyleClass)) {
          c.className = this.submenuStyleClass;
        }
        
        c.style.position = "absolute";
        c.style.zIndex = 10;
        //c.style.width = (xw.Sys.isUndefined(width) ? "400px" : width + "px");
        //c.style.height = (xw.Sys.isUndefined(height) ? "400px" : height + "px");
        
        var rect = this.control.getBoundingClientRect();        
        
//        c.style.right = "0px";
//        c.style.width = "400px";
//        c.style.height = "400px";

        c.style.top = (rect.bottom + 1) + "px";  
        c.style.left = rect.left + "px";
        c.style.overflow = "hidden";
        
        this.renderChildren(c);
        
        document.body.appendChild(c);
        this.submenuContainer = c;
      } else {
        this.submenuContainer.style.display = "";
      }
    }
    this.submenuOpen = !this.submenuOpen;
  }
});

org.xwidgets.core.MenuBar = xw.Visual.extend({
  _constructor: function() {
    this._super();
    this.registerProperty("styleClass", {default: "xw_menubar"});
    this.control = null;    
  },
  render: function(container) {
    if (this.control == null) {
      this.control = document.createElement("div");
      if (xw.Sys.isDefined(this.styleClass)) {
        this.control.className = this.styleClass;
      }
      
      container.appendChild(this.control);      
    }
    
    this.renderChildren(this.control);
  }
});
