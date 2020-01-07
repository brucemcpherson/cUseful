var Unnest = (function (ns){

  /**
  * converts blowup into table
  *
  * @param {object[]} {blownup} the array from blowup
  * @param {function} {sorter} a function to sort the headers
  * @return {*[][]} the 2 dimensional array of values with the headers in the first row
  */
  ns.blownupToTable = function (options) {
    var blownup = options.blownup;
    var sorter = options.sorter || function(mentions) {
      return Object.keys(mentions).sort(function (a, b) { return a - b; });
    };
    
    // collect all the property names
    var mentions = blownup.reduce(function (p, c) {
      Object.keys(c).forEach(function (k, i) {
        p[k] = i;
      });
      return p;
    }, {});
    
    // make that into a header row
    var headerRow = sorter(mentions);
    // now add the rows after the header
    // & we dont really like undefined in sheets, so replace with null.
    return [headerRow].concat(blownup.map(function(row) {
      return headerRow.map(function (h) {
        return typeof row[h] === typeof undefined ? null : row[h]
      });
    }));
  };
  
  /**
  * an array of object(or an object of arrays) gets blown up into rows one row per array element
  * nested arrays are handled too so an array of 5 with 10 nested array would create 50 rows and so on
  * array members dont need to have the same properties, and can each contain separate nested arrays
  * each flattened property is given a property name reflecting the object tree preceding, so
  * {a:{b:{c:{name:'rambo'}}}} 
  * would be expressed as
  * {a_b_c_name: 'rambo'}
  * {a:{b:[{c:{name:'rambo'}}, {c:{name:'terminator'}}]}}
  * would be expressed as 
  * [{a_b_c_name: 'rambo'},[{a_b_c_name: 'terminator'}]
  * @param {object|object[]} {ob} the object to be blown up
  * @param {string} [{sep}] the separator to use betwenn propertyu name sections
  * @param {function} [{cloner}] a function to deep clone an obje
  */
  ns.blowup = function (options) {
    var ob = options.ob;
    var sep = options.sep || '_';
    var cloner = options.cloner || function(item) { return JSON.parse(JSON.stringify(item))};
    
    var isObject = function (sob) {
      return typeof (sob) === 'object' && !(sob instanceof Date);
    };
    
    // recursive piece
    var makeRows = function (sob, rows, currentKey, cob) {
      rows = rows || [];
      currentKey = currentKey || '';
      cob = cob || {};
      
      // ignore undefined or null items
      if (typeof sob === typeof undefined || sob === null) {
        return rows;
      } else if (Array.isArray(sob)) {
        // going to work through an array creating 1 row for each element
        // but without adding to the current key
        // make deep clone of current object
        sob.forEach(function(f, i) {
          // make clone of what we have so far to replicate across
          var clob = cloner(cob);
          // the first element updates an existing row
          // subsequent elements add to the number of rows
          if (i) {
            rows.push(clob);
          } else {
            rows[rows.length ? rows.length - 1 : 0] = clob;
          }
          // recurse for each element
          makeRows(f, rows, currentKey, clob);
        });
      } else if (isObject(sob)) {
      // deal with the non object children first so they get cloned too   
        Object.keys(sob).sort(function(a,b) { 
         return isObject(sob[a]) && isObject(sob[b]) ? 0 : (isObject(sob[b]) ? -1: 1);
        }).forEach(function (k, i) {
          // add to the key, but nothing to the accumulating object
          makeRows(sob[k], rows, currentKey ? currentKey + sep + k : k, cob);
        });
      } else {
        // its a natural value
        if (cob.hasOwnProperty(currentKey)) {
          // something has gone wrong here - show should probably be a throw
          Logger.log('attempt to to overwrite property', cob, currentKey, 'row', rows.length);
        } else {
          cob[currentKey] = sob;
        }
      }
      return rows;
    };
    
    // do the work - the input data should be an array of objects
    if(!Array.isArray(ob)) ob = [ob];
    return makeRows(ob);
  };
  
  ns.table = function (options) {
    var blownup = ns.blowup(options);
    return ns.blownupToTable ({ blownup: blownup, sorter: options.sorter });                       
  };
  return ns;
}) ({});

