function Tester () {

    var self = this;
    var indent = 0; 
    var good ;
    var flogger = function (mess) {
      Logger.log (mess);
    };
    
    function spaces () {
      return new Array(indent+1).slice().join ("-");
    }
    
    self.assure = function (valid) {
      if (!valid) good = false;
      if (!valid) {
        self.logger (Array.prototype.slice.call(arguments,1));
      }
      return valid;
    };
    
    self.assureThrow = function (valid) {
      if (!valid) good = false;
      if (!valid) {
        self.thrower (Array.prototype.slice.call(arguments,1));
      }
      return valid;
    };
    self.logger = function () {
      var args = Array.prototype.slice.apply(arguments);
      var mess = (args || []).map (function (d) {
        if (typeof d === "object") return JSON.stringify(d);
        return d.toString ? d.toString() : d;
      }).join ("\n" + spaces());
      flogger (spaces() + mess);
      return self;
    };
  
    self.thrower = function () {
      var args = Array.prototype.slice.apply(arguments);
      var mess = (args || []).map (function (d) {
        if (typeof d === "object") return JSON.stringify(d);
        return d.toString ? d.toString() : d;
      }).join ("\n" + spaces());
      throw mess;
      return self;
    };
  
    self.it = function (test , func) {
      good = true;
      self.logger ("starting test " + test);
      var result = func();
      self.logger ("ending test " + test + (good ? "-OK" :"-FAILED"));
      return result;
    };
    
    self.describe = function (section , func ) {
      self.logger  ("starting section " + section) ;
      indent += 2;
      var result = func();
      indent -=2;
      self.logger  ("ending section " + section) ;
      return result;
    };
}