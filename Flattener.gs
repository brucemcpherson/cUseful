/**
 * @param {string} optObKeep if specified,objects of this key wont be flattened
 * @return {Flattener} self
 */

var Flattener = function(optObKeep) {
  var self = this;
  self.obKeep = optObKeep || null;
  self.sep = ".";
  self.keepDates = false;
    self.setKeepDates = function (keep) {
    self.keepDates = keep;
    return self;
  };
  self.setSep = function (sep) {
    self.sep = sep;
    return self;
  };
  
  return self;          
};

  
/** get an array of objects from sheetvalues and unflatten them
 * @parameter {Array.object} values a 2 dim array of values return by spreadsheet.getValues()
 * @return {object} an unflatten object
 **/
Flattener.prototype.getObjectsFromValues = function (values) {
  var self = this;
  var obs = [];
  for (var i=1 ; i < values.length ; i++){
    var k = 0;
    obs.push(self.unFlatten(values[i].reduce (function (p,c) {
      p[values[0][k++]] = c;
      return p;
    } , {})));
  }
  return obs;
  
};

/** get values from an array of objects by flattening and sorting all the keys found
 * @parameter {Array.object} obs an array of objects
 * @return {Array.object} a two dim array of values
 **/ 
Flattener.prototype.getValues = function(obs) {
  var self = this;
  var headings = self.getHeadingMap(obs);
  var headingValues = Object.keys(headings);
  var width = headingValues.length;
  
  return [headingValues].concat(obs.map ( function (row) {
    var v =[];
    for (var i=0;i<width;i++)v.push('');
    var o = self.flatten(row);
    Object.keys(o).forEach( function (k) {
      v[headings[k]] = o[k];
    });
    return v;
  }));
  
};
  
/** get headings from an array of objects by flattening and sorting all the keys found
 * @parameter {Array.object} obs an array of objects
 * @return {object} a flattened object with a property for each key and its position
 **/ 
Flattener.prototype.getHeadingMap = function(obs) {
  var self = this;
  var headings = {},n=0;
  obs.forEach ( function (row) {
    headings = Object.keys(self.flatten(row)).reduce(function(p,c) {
      if (!p.hasOwnProperty(c)) {
        p[c] = 0;
      }
      return p;
    },headings );
  });
  // sort the keys
  return Object.keys(headings).sort ( function (a,b) {
    return a > b ? 1 : ( a===b ? 0 : -1);
  })
  .reduce(function (p,c) {
    p[c] = n++;
    return p;
  },{});
};
  
/** unFlatten an ob
 * creates this {a:1,b:2,c:{d:3,e:{f:25}},g:[1,2,3]}
 * from this {a:1,b:2,"c.d":3,"c.e.f":25,"g.0":1,"g.1":2,"g.2":3}
 * @parameter {object} ob the object to be unflattened
 * @return {object} the unflattened object
 **/
Flattener.prototype.unFlatten = function (ob) {
  var self = this;
  return Object.keys(ob).reduce(function (p,c) {
    var pk=p, keys = c.split(self.sep);
    for (var i=0; i < keys.length-1 ;i++) {
      if (!pk.hasOwnProperty(keys[i])) { 
        pk[keys[i]] = self.isNumber(keys[i+1]) ? [] : {};
      }
      pk = pk[keys[i]];
    }
    var k = keys[keys.length-1];
    pk[k] = ob[c];
    return p;
  },Array.isArray(ob) ? [] : {});
  
};

/** flatten an ob
 * turns this {a:1,b:2,c:{d:3,e:{f:25}},g:[1,2,3]}
 * into this {a:1,b:2,"c.d":3,"c.e.f":25,"g.0":1,"g.1":2,"g.2":3}
 * @parameter {object} ob the object to be flattened
 * @return {object} the flattened object
 **/
Flattener.prototype.flatten = function(ob) {
  var self = this;
  return  self.objectDot (ob).reduce(function(p,c){
    p[c.key] = c.value;
    return p;
  },{});
};

Flattener.prototype.objectSplitKeys  = function (ob,obArray,keyArray) {
  obArray = obArray || [];
  var self = this;
  //turns this {a:1,b:2,c:{d:3,e:{f:25}}}
  // into this, so that the keys can be joined to make dot syntax
  //[{key:[a], value:1},{key:[b], value:2} , {key:[c,d], value:3}, {key:[c,e,f], value:25}]
  
  if (self.isObject(ob)) {

    Object.keys(ob).forEach ( function (k) {
      var ka = keyArray ? keyArray.slice(0) : [];
      ka.push(k);

      if(self.isObject(ob[k])  && (!self.obKeep || !ob[k][self.obKeep]) && ( !self.keepDates || !self.isDateObject(ob[k]))) {
        self.objectSplitKeys (ob[k],obArray,ka);
      }
      else {
        obArray.push ( {key:ka, value:ob[k]} );
      }
      
    });
  }
  else {
    obArray.push(ob);
  }
  
  return obArray;
};

  
Flattener.prototype.objectDot = function (ob) {
  var self = this;
  return self.objectSplitKeys (ob).map ( function (o) {
    return {key:o.key.join(self.sep), value:o.value};
  });
};

Flattener.prototype.isObject  = function (obj) {
  return obj === Object(obj);
}; 

Flattener.prototype.isNumber = function (s) {
  return !isNaN(parseInt(s,10)) ;
};

Flattener.prototype.isDateObject = function (ob) {
  return this.isObject(ob) && ob.constructor && ob.constructor.name === "Date";
};

/** get headings from an array of objects by flattening and sorting all the keys found
 * @parameter {Array.object} obs an array of objects
 * @return {Array.object} an array of heading values
 **/ 
Flattener.prototype.getHeadings = function(obs) {
  return Object.keys(self.getHeadingMap(obs));
};
  
