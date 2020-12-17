/**
* this is a utility for messing around with 
* values obtained from setValues method 
* of a spreadsheet
* @contructor Fiddler
* @param {Sheet} [sheet=null] populate the fiddler 
*/
function Fiddler(sheet) {
  
  var self = this;
  var values_,
      headerOb_,
      dataOb_ = [],
      hasHeaders_ = true,
      functions_,
      renameDups_ = true,
      renameBlanks_ = true,
      blankOffset_ = 0,
      sheet_ = null,
      headerFormat_ = {},
      columnFormats_ = null,
      tidyFormats_ = false,
      flatOptions_ = null,
      defaultFlat = {
        flatten:true,
        objectSeparator:".",
        itemSeparator:",",
        expandArray: true,
        columns:[]
      };
  
  /**
   * TODO .. its a long story because of formatting 
   * work out details for next major version
   *
   * flattener works like this
   * when writting to a sheet
   * any objects get flattened 
   *  {a:1,b:2,c:{d:3,e:{f:25}},g:[1,2,3]}
   *  becomes  
   *  header of a,b c.d c.e.f g.o g.1 g.2
   *  values of 1 2 3 25 1 2 3
   *  objectseparator(".") is used in headers as in "c.d" and "g.1" 
   *  and itemSeparator is used in arrays where expandArray is true as in 1 2 3 versus 1,2,3 in a single column
   * when reading from a sheet
   *  headers are investigated for patterns like above and get shrunk back into objects/arrays
   **/
  
  /**
  * these are the default iteration functions
  * for the moment the do nothing
  * just here for illustration
  * properties take this format
  * not all are relevant for each type of function
  * .name the name of the column
  * .data all the data in the fiddle
  * .headers the header texts
  * .rowOffset the row number starting at 0
  * .columnOffset the column number starting at 0
  * .fiddler this object
  * .values an array of values for this row or column
  * .row an object with all the properties/values for the current row
  */
  var defaultFunctions_ = {
    
   /**
    * used to compare two values
    * @param {*} a itema
    * @param {*} b item b
    * @return {boolean} whether the same
    */
    compareFunc: function(a,b) {
      return a===b;
    },
    
    /**
    * used to filter rows
    * @param {object} row the row object
    * @param {object} properties properties of this  row
    * @return {boolean} whether to include
    */
    filterRows: function(row, properties) {
      return true;
    },
    
    /**
    * used to filter columns
    * @param {string} heading the heading text 
    * @param {object} properties properties of this  column
    * @return {boolean} whether to include
    */
    filterColumns: function(heading, properties) {
      return true;
    },
    
    /**
    * used to change objects rowwise
    * @param {object} row object 
    * @param {object} properties properties of this row
    * @return {object} modified or left as is row 
    */
    mapRows: function(row, properties) {
      return row;
    },
    
    /**
    * used to change values columnwise
    * @param {[*]} values the values for each row of the column
    * @param {object} properties properties of this column
    * @return {[*]|undefined} values - modified or left as is 
    */
    mapColumns: function(values, properties) {
      return values;
    },
    
    /**
    * used to change values columnwise in a single column
    * @param {*} value the values for this column/row
    * @param {object} properties properties of this column
    * @return {[*]|undefined} values - modified or left as is 
    */
    mapColumn: function(value, properties) {
      return value;
    },
    
    /**
    * used to change header values
    * @param {string} name the name of the column
    * @param {object} properties properties of this column
    * @return {[*]|undefined} values - modified or left as is 
    */
    mapHeaders: function(name, properties) {
      return name;
    },
    
    /**
    * returns the indices of matching values in a column
    * @param {*} value the values for this column/row
    * @param {object} properties properties of this column
    * @return {boolean} whether it matches 
    */
    selectRows: function(value, properties) {
      return true;
    }
    
  };
  
  // maybe a later version we'll allow changing of default functions
  functions_ = defaultFunctions_;
  
  /**
  * @param {Sheet} sheet
  */
  self.setSheet = function (sheet) {
    sheet_ = sheet;
    return self;
  };
  
  /**
  * @return {Sheet} sheet
  */
  self.getSheet = function () {
    return sheet_ ;
  };
  
  
  
  
  /// ITERATION FUNCTIONS
  /**
  * iterate through each row - given a specific column
  * @param {string} name the column name
  * @param {function} [func] optional function that shoud true or false if selected
  * @return {Fiddler} self
  */
  self.selectRows = function(name, func) {
    
    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);
    var result = [];
    
    // add index if function returns true
    values.forEach(function(d, i) {
      if ((checkAFunc(func) || functions_.selectRows)(d, {
        name: name,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: i,
        columnOffset: columnIndex,
        fiddler: self,
        values: values,
        row: dataOb_[i]
      })) result.push(i);
    });
    
    return result;
  };
  
  /**
  * iterate through each row - nodifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return a new row if changes made
  * @return {Fiddler} self
  */
  self.mapRows = function(func) {
    
    dataOb_ = dataOb_.map(function(row, rowIndex) {
      var rowLength = Object.keys(row).length;
      var result = (checkAFunc(func) || functions_.mapRows)(row, {
        name: rowIndex,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: rowIndex,
        columnOffset: 0,
        fiddler: self,
        values: self.getHeaders().map(function(k) {
          return row[k];
        }),
        row: row
      });
      
      if (!result || typeof result !== "object") {
        throw new Error ("you need to return the row object - did you forget?");
      }
      
      if (Object.keys(result).length !== rowLength) {
        throw new Error(
          'you cant change the number of columns in a row during map items'
        );
      }
      
      
      return result;
    });
    
    return self;
  };
  
  self.setRenameDups = function(rename) {
    renameDups_ = rename;
    return self;
  };
  self.setRenameBlanks = function(rename) {
    renameBlanks_ = rename;
    return self;
  };
  self.setBlankOffset = function(off) {
    blankOffset_ = off;
    return self;
  };
  
  /**
  * get the unique values in a column
  * @param {string} columnName
  * @param {function} [compareFunc]
  * @return {[*]} array of unique values
  */
  self.getUniqueValues = function(columnName, compareFunc) {
    
    return self.getColumnValues(columnName)
    .filter(function(d, i, a) {
      return axof_ (d , a, compareFunc) === i;
    });
    
  };
  
  // like indexof except with custom compare
  function axof_ ( value , arr, compareFunc ) {
    var cf = checkAFunc(compareFunc) || functions_.compareFunc;
    for (var i = 0 ; i < arr.length ; i++) {
       if (cf  (value , arr[i])) return i;
    }
    return -1;
  }                                                
                                                   
  
  /**
  * iterate through each row - nodifies the data in this fiddler instance
  * @param {[string]} [columnNames] optional which column names to use (default is all)
  * @param {boolean} [keepLast=false] whether to keep the last row or the first found
  * @param {function} [compareFunc] compare values function
  * @return {Fiddler} self
  */
  self.filterUnique = function(columnNames, keepLast, compareFunc) {
    
    var headers = self.getHeaders();
    cols = columnNames || headers;
    if (!Array.isArray(cols)) cols = [cols];
    
    // may need to reverse
    var data = dataOb_.slice();

    // check params are valid
    if (cols.some(function(d) {
      return headers.indexOf(d) === -1;
    })) {
      throw 'unknown columns in ' + JSON.stringify(cols) + ' compared to ' + JSON.stringify(headers);
    }

    // filter out dups
    data = data.filter(function(d, i, a) {
      // if we're keeping the first one, then keep only if there's none before
      // if the last one, then keep only if there are none following
      var soFar = keepLast ? a.slice (i+1) : a.slice (0 , i);
      
      return !soFar.some(function(e) {
        return cols.every(function(f) {
          return (checkAFunc(compareFunc) || functions_.compareFunc)  (d[f] , e[f]);
        });
      });

    });
    

   
    // register
    dataOb_ = data;
    return self;
    
  };
  /**
   * set header format
   * @param {object} headerFormat {backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
   * @return self
   */
  self.setHeaderFormat = function (headerFormat) {
    headerFormat_ = headerFormat;
    return self;
  };
  
  /**
   * sort out a list of column names and throw if any invalid
   * @param {[string]} [columnNames] can be an array, single or undefined for all
   * @return {[string]} an array of column names
   */
  function patchColumnNames_ ( columnNames ) {
    // undefined columnNames means them all
    // names can be a single column or an array
    var headers = self.getHeaders(); 
    columnNames = typeof columnNames === typeof undefined || columnNames === null ? headers : (Array.isArray(columnNames) ? columnNames : [columnNames] );
    var bad = columnNames.filter (function (d) {
      return headers.indexOf (d) === -1;
    });
    if (bad.length) throw "these columnNames don't exist " + bad.join (",");
    return columnNames;
  }
  
  /**
   * clear given column formats
   */
  self.clearColumnFormats = function (columnNames) {
    columnFormats_ = columnFormats_ || {};
    patchColumnNames_ (columnNames)
    .forEach (function (d) {
      columnFormats_ [d] = null;
    });
    return self;
  };
  /**
   * get all known columnFormats
   */
  self.getColumnFormats = function () {
    return columnFormats_;
  };
  
  /**
   * set tidy formats
   * @param {boolean} tidyFormats whether to tidy formats in space outside the data being written
   * @return self
   */
  self.setTidyFormats = function (tidyFormats) {
    tidyFormats_ = tidyFormats;
    return self;
  };
  
  /**
   * get tidy formats
   * @return {boolean} tidyFormats whether to tidy formats in space outside the data being written
   */
  self.getTidyFormats = function () {
    return tidyFormats;
  };
  /**
   * set column format 
   * @param {object} columnFormat eg{backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
   * @param {[string]} [columnNames=all] default is it applies to all current columns
   * @return self
   */
  self.setColumnFormat = function (columnFormat, columnNames) {
    // validate them
    columnNames = patchColumnNames_ (columnNames);
    // a non-null column format means we actually have an interest in columnformats
    columnFormats_ = columnFormats_ || {};
    // apply them
    columnNames.forEach (function (d) { columnFormats_[d] = columnFormat });
    return self;
  };
  
  /**
   * set flatting options
   * @param 
   * @return self
   */
  self.setFlattener = function (options) {
    flattenOptions_ = options;
    return self;
  };
  
  /**
   * get flattening options
   * @param 
   * @return self
   */
  self.getFlattener = function (options) {
    return flattenOptions_;
  };
  
  /**
   * applies  formats
   * @param {object} format eg .. {backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
   * @param {Range}
   * @return {range}
   */
  self.setFormats = function (range, format) {
    // if there's anything to do
    var atr = range.getNumRows();
    var atc = range.getNumColumns();
    if(atc && atr){
      // for every format mentioned
      Object.keys(format).forEach (function (f) {
        // check method exists and apply it
        var method = 'set'+f.slice(0,1).toUpperCase()+f.slice(1).replace (/s$/,"").replace(/ies$/,"y");
        if (typeof range[method] !== "function") throw 'unknown format ' + method;
        range[method](format[f]);
      });
    }
    return self;
  };
  
  /**
  * applies  formats to a rangelist
  * @param {object} format eg .. {backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
  * @param {Range}
  * @return {range}
  */
  self.setRangelistFormat = function (rangeList, format) {
    // if there's anything to do
    if (rangeList) {
      Object.keys(format).forEach (function (f) {
        var method = 'set'+f.slice(0,1).toUpperCase()+f.slice(1);
        // patch in case its plural 
        method = method.replace (/s$/,"").replace(/ies$/,"y");
        if (typeof rangeList[method] !== "function") throw 'unknown format ' + method;
        rangeList[method](format[f]);
      })
    }
    return self;
  };
  
  /**
   * apply header formats
   * @param {range} range the start range for the headers
   * @param {object} [format=headerFormat_] the format object
   * @return self;
   */
  self.applyHeaderFormat = function (range, format) {
    if (!self.getNumColumns()) return self;
    format = format || headerFormat_;
    var rangeList = self.makeRangeList ([range.offset(0,0,1,self.getNumColumns())], {numberOfRows:1} , range.getSheet() );
    return self.setRangelistFormat (rangeList, headerFormat_); 
  };
    
  /**
   * apply column formats
   * @param {range} the start range
   * @param {object} [format=columnFormats_] the format objects
   * @return self;
   */
  self.applyColumnFormats = function (range )  {
    var foCollect = [];
    
    if ( columnFormats_ ) {
      // we'll need this later
      var dr = range.getSheet().getDataRange();
      var atr = dr.getNumRows();
      /// make space for the header
      if (self.hasHeaders() && atr > 1) {
        dr = dr.offset (1,0,atr-1);
      }
      if (Object.keys (columnFormats_).length === 0) {
        // this means clear format for entire thing
        dr.clearFormat();
      }
      else {
        // first clear the bottom part of the sheet with no data
        var atr = dr.getNumRows();
        if (atr > self.getNumRows() && self.getNumRows()) {
          dr.offset ( self.getNumRows() - atr , 0 , atr - self.getNumRows()).clearFormat();
        }

        if (self.getNumRows() ) {
          Object.keys(columnFormats_)
          .forEach (function (d) {
            var o = columnFormats_ [d];
            // validate still exists
            var h = self.getHeaders().indexOf(d);
            if (h !== -1 ) {
              // set the range for the data
              var r = dr.offset (0,h, self.getNumRows() , 1);
              if (!o) {
                // its a clear
                r.clearFormat();
              }
              else {
                //self.setFormats  (r, o);
                foCollect.push ({
                  format: o ,
                  range: r
                });
              }
            }
            else {
              // delete it as column is now gone
              delete columnFormats_[d];
            }
          });
        }
      }
    }
    else {
      // there;'s no formatting to do
    }
    // optimize the formatting
    var foNew = foCollect.reduce (function (p,c) {
      // index by the format being set
      var sht = c.range.getSheet();
      var sid = sht.getSheetId();
      Object.keys(c.format)
      .forEach (function (f) {
        var key = f+"_"+c.format[f]+"_"+sid;
        p[key] = p[key] || {
          value:c.format[f],
          format:f,
          ranges:[],
          sheet:sht
        };
        p[key].ranges.push (c.range);
      })
      return p;
    } , {});
    
    // now make rangelists and apply formats 
    Object.keys(foNew)
    .forEach (function (d) {
      var o = foNew[d];
      // make the range list - they are all ont he same sheet
      var sht = o.sheet;
      var rangeList = sht.getRangeList (o.ranges.map(function (e) { return e.getA1Notation(); }));
      // workout the method (could be pluralized)
      var method = "set"+o.format.slice(0,1).toUpperCase()+o.format.slice(1).replace (/s$/,"").replace(/ies$/,"y");
      var t = {};
      t[o.format] = o.value;
      if (!rangeList[method]) {
        // fall back to individual ranges
        rangeList.getRanges()
        .forEach (function (e) {
          self.setFormats (e , t);
        });
      }
      else {
        rangeList[method] (o.value);
      }
    });
   
    return self;
    
  }
  /**
   * get header format
   * @return self
   */
  self.getHeaderFormat = function () {
    return headerFormat_;
  };
  
  /**
  * iterate through each row - nodifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return true if the row is to be kept
  * @return {Fiddler} self
  */
  self.filterRows = function(func) {
    
    dataOb_ = dataOb_.filter(function(row, rowIndex) {
      return (checkAFunc(func) || functions_.filterRows)(row, {
        name: rowIndex,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: rowIndex,
        columnOffset: 0,
        fiddler: self,
        values: self.getHeaders().map(function(k) {
          return row[k];
        }),
        row: row
      });
    });
    return self;
  };
  /**
  * mapSort
  * @param {string} name column name
  * @param {boolean} [descending=false] sort order 
  * @param {Fiddler} [auxFiddler] another fiddler to drive the sort
  * @return {[object]} fiddler data sorted
  */
  self.sort = function(name,  descending, auxFiddler) {
    if (self.getHeaders().indexOf(name) === -1) {
      throw new Error(name + ' is not a valid header name');
    }
    return self.handySort (self.getData() , {
      values: auxFiddler ? auxFiddler.getData() : null,
      descending:descending,
      extractFunction: function (values,a) {
        return values[a][name];
      }
    });
    
  };
  /**
   * sort returns sorted values
   * for chaining , can be handy to return the fiddler
   */
  self.sortFiddler = function (name , descending , auxFiddler ) {
    var data = self.sort (name , descending , auxFiddler);
    // the true means we try to preserve the order of the original fiddler columns
    // if possible - as self data would normally recreate them according to insert time
    self.setData (data, true);
    return self;
  }
  
  self.handySort = function (displayValues, options) {
    // default comparitor & extractor
    options = options || {};
    var descending = options.descending || false;
    var defaultExtract = function(values, a) {
      return values[a];
    };
    var extractFunc = options.extractFunction || defaultExtract;
    var compareFunc = options.compareFunc || function(a, b) {
      return a > b ? 1 : (a === b ? 0 : -1);
    };
    
    // allow regular sorting too
    var values = options.values || displayValues;
    
    if (displayValues.length !== values.length) {
      throw 'value arrays need to be same length';
    }
    
    return displayValues.map(function(d, i) {
      // make an array of indices
      return i;
    })
    .sort(function(a, b) {
      // sort the according to values the point to
      return compareFunc(
        extractFunc(values, descending ? b : a), extractFunc(values, descending ? a : b)
      );
    })
    .map(function(d) {
      // reorder the tartget array according to index on the values
      return displayValues[d];
    });
    
  }
  
  /**
  * iterate through each column - modifies the data in this fiddler instance
  * @param {string} name the name of the column
  * @param {function} [func] optional function that shoud return new column data
  * @return {Fiddler} self
  */
  self.mapColumn = function(name, func) {
    
    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);
    
    values.forEach(function(value, rowIndex) {
      
      dataOb_[rowIndex][name] = (checkAFunc(func) || functions_.mapColumns)(value, {
        name: name,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: rowIndex,
        columnOffset: columnIndex,
        fiddler: self,
        values: values,
        row: dataOb_[rowIndex]
      });
      
    });
    
    return self;
  };
  
  /**
  * iterate through each column - modifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return new column data
  * @return {Fiddler} self
  */
  self.mapColumns = function(func) {
    
    var columnWise = columnWise_();
    var oKeys = Object.keys(columnWise);
    
    oKeys.forEach(function(key, columnIndex) {
      // so we can check for a change
      var hold = columnWise[key].slice();
      var result = (checkAFunc(func) || functions_.mapColumns)(columnWise[key], {
        name: key,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: columnWise[key]
      });
      
      // changed no of rows?
      if (!result || result.length !== hold.length) {
        throw new Error(
          'you cant change the number of rows in a column during map items'
        );
      }
      // need to zip through the dataOb and change to new column values
      if (hold.join() !== result.join()) {
        result.forEach(function(r, i) {
          dataOb_[i][key] = r;
        });
      }
    });
    
    return self;
  };
  
  /**
  * iterate through each header
  * @param {function} [func] optional function that shoud return new column data
  * @return {Fiddler} self
  */
  self.mapHeaders = function(func) {
    
    if (!self.hasHeaders()) {
      throw new Error('this fiddler has no headers so you cant change them');
    }
    
    var columnWise = columnWise_();
    var oKeys = Object.keys(columnWise);
    var nKeys = [];
    
    oKeys.forEach(function(key, columnIndex) {
      
      var result = (checkAFunc(func) || functions_.mapHeaders)(key, {
        name: key,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: columnWise[key]
      });
      
      // deleted the header
      if (!result) {
        throw new Error(
          'header cant be blank'
        );
      }
      
      nKeys.push(result);
    });
    
    // check for change
    if (nKeys.join() !== oKeys.join()) {
      headerOb_ = {};
      dataOb_ = dataOb_.map(function(d) {
        return oKeys.reduce(function(p, c) {
          var idx = Object.keys(p).length;
          headerOb_[nKeys[idx]] = idx;
          p[nKeys[idx]] = d[c];
          return p;
        }, {});
      });
    }
    return self;
  };
  

  /**
  * iterate through each column - modifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return true if the column is to be kept
  * @return {Fiddler} self
  */
  self.filterColumns = function(func) {
    checkAFunc(func);
    
    var columnWise = columnWise_();
    var oKeys = Object.keys(columnWise);
    
    // now filter out any columns
    var nKeys = oKeys.filter(function(key, columnIndex) {
      var result = (checkAFunc(func) || functions_.filterColumns)(key, {
        name: key,
        data: dataOb_,
        headers: headerOb_,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: self.getColumnValues(key)
      });
      return result;
    });
    
    // anything to be deleted?
    if (nKeys.length !== oKeys.length) {
      dataOb_ = dropColumns_(nKeys);
      headerOb_ = nKeys.reduce(function(p, c) {
        p[c] = Object.keys(p).length;
        return p;
      }, {});
    }
    return self;
  };
  
  //-----
  
  /**
  * get the values for a given column
  * @param {string} columnName the given column
  * @return {[*]} the column values
  */
  self.getColumnValues = function(columnName) {
    if (self.getHeaders().indexOf(columnName) === -1) {
      throw new Error(columnName + ' is not a valid header name');
    }
    // transpose the data
    return dataOb_.map(function(d) {
      return d[columnName];
    });
  };
  
  /**
  * get the values for a given row
  * @param {number} rowOffset the rownumber starting at 0
  * @return {[*]} the column values
  */
  self.getRowValues = function(rowOffset) {
    // transpose the data
    return headOb_.map(function(key) {
      return d[rowOffset][headOb_[key]];
    });
  };
  
  /**
  * copy a column before
  * @param {string} header the column name 
  * @param {string} [newHeader] the name of the new column - not needed if no headers
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {Fiddler} self
  */
  self.copyColumn = function(header, newHeader, insertBefore) {
    
    // the headers
    var headers = self.getHeaders();
    var headerPosition = headers.indexOf(header);
    
    if (!header || headerPosition === -1) {
      throw new Error('must supply an existing header of column to move');
    }
    
    var columnOffset = insertColumn_(newHeader, insertBefore);
    
    // copy the data
    self.mapColumns(function(values, properties) {
      return properties.name === newHeader ? self.getColumnValues(header) : values;
    });
    
    return self;
  };
  
  /**
   * given a sheet, will populate
   * @param {Sheet} sheet
   */
  self.populate = function (sheet) {
    
    // first set the default sheet
    self.setSheet (sheet);
    
    // get the range 
    var range = sheet.getDataRange();
    
    // set the values
    return self.setValues (range.getValues());
    
  };
  
  /**
   * dump values with default values 
   * @param {Sheet} [sheet=null] the start range to dump it to
   * @param {object} options {skipFormats:,skipValues}
   * @return self
   */
  function dumpValues_ (sheet, options) {
    
    if (!sheet && !sheet_) throw 'sheet not found to dump values to';
    var range =(sheet || sheet_).getDataRange();
    if (!options.skipValues) range.clearContent();

    // if we're flattening then we need to do some fiddling with the data
    // TODO .. its a long story because of formatting 
    // do it in next major version
    
    // we only do something if there's anydata
    var r = self.getRange(range);
    var v = self.createValues();

    // we need to clear any formatting outside the ranges that may have been deleted
    if (tidyFormats_ && !options.skipFormats) {
      var rtc = r.getNumColumns ();
      var rtr = range.getNumRows();
      var atc = range.getNumColumns();
      var atr = range.getNumRows();
      var rc = atc > rtc && atr ? 
        range.offset (0, rtc , atr , atc - rtc).getA1Notation() : "";
      var rr = atr > rtr && atc ? 
        range.offset (rtr , 0,  atr - rtr).getA1Notation() : "";
      var rl = [];
      if (rc) rl.push (rc);
      if (rr) rl.push (rr);
      if (rl.length)range.getSheet().getRangeList (rl).clearFormat();
    }
    
    // write out the sheet if there's anything
    if (!options.skipValues && v.length && v[0].length) r.setValues (v);

    // do header formats
    if (!options.skipFormats && v[0].length)self.applyHeaderFormat(range);
    
    // do column formats
    if (!options.skipFormats) self.applyColumnFormats (range);
    
    return self;                       
  };
   /**
   * dump values with default values 
   * @param {Sheet} [sheet=null] the start range to dump it to
   */
  self.dumpValues = function (sheet) {
    return dumpValues_ (sheet , {
      skipFormats: false,
      skipValues: false
    });
  };
   /**
   * dump values with default values 
   * @param {Sheet} [sheet=null] the start range to dump it to
   */
  self.dumpFormats = function (sheet) {
    return dumpValues_ (sheet , {
      skipFormats: false,
      skipValues: true
    });
  };
  
  /**
   * get the header an index number
   * @param {string} the header
   * @return {number} the index
   */
  self.getHeaderIndex = function (header) {
    return self.getHeaders().indexOf ( header );
  };
  
  /**
   * get the header by index number
   * @param {number} the index number (-1) the last one, -2 2nd last etc
   * @return {string} the header
   */
  self.getHeaderByIndex = function (index) {
    var headers = self.getHeaders();
    return index < 0 ? headers[headers.length+index] : headers[index];
  };
  
  /**
   * get the names of columns occurring between start and finish
   * @param {string} [start=the first one] start column name (or the first one)
   * @param {string} [finish=the last one] finish column name (or the last one)
   * @return {[string]} the columns 
   */
  self.getHeadersBetween = function ( start , finish ) {
    start = start || self.getHeaderByIndex(0);
    finish = finish || self.getHeaderByIndex(-1);
    startIndex = self.getHeaderIndex(start);
    finishIndex = self.getHeaderIndex(finish);
    if (startIndex === -1) throw 'column ' + start + ' not found';
    if (finishIndex === -1) throw 'column ' + finish + ' not found';
    var [s,f] = [startIndex, finishIndex].sort ();
    var list = self.getHeaders().slice (s,f+1);
    return startIndex > finishIndex ? list.reverse() : list;
  }
  /**
   * get the rangelist for a group of columns
   * @param {sheet} sheet 
   * @param {[string]} [columnNames=*] default is all of them
   * @param {object} [options={rowOffset:1,numberOfRows:1,columnOffset:1,numberOfColumns:1}]
   * @return {RangeList}
   */
  self.getRangeList = function (columnNames,options,sheet) {
    options = options || {};
    sheet = sheet || sheet_;
    if (!sheet) throw 'sheet must be provided to getRangeList';
    var range =  self.getRange (sheet.getDataRange());
    
    // range will point at start point of data
    var atr = range.getNumRows();
    if ( self.hasHeaders() && atr > 1 ) range = range.offset (1,0,atr-1);


    // default options are the whole datarange for each column
    var defOptions = {rowOffset:0,numberOfRows:self.getNumRows(),columnOffset:0,numberOfColumns:1};
    
    // set defaults and check all is good
    Object.keys(defOptions).forEach (function (d) {
      if(typeof options[d] === typeof undefined) options[d] = defOptions[d];
    });
    Object.keys(options).forEach (function (d) {
      if(typeof options[d] !== "number" || !defOptions.hasOwnProperty(d) || options[d] < 0 )throw 'invalid property/value option ' + d + options[d] + 'to getRangeList ';
    });
    
    ///
    
    // get the columnnames and expand out as required
    var columnRanges = patchColumnNames_(columnNames)
    .map (function (d) {
      return range.offset ( options.rowOffset , headerOb_[d] + options.columnOffset , options.numberOfRows || 2, options.numberOfColumns || 2).getA1Notation();
    })
    .map (function (d) {
      // need to treat number of rows (B1:B) or num of columns (c1:1) being 0
      if (options.numberOfRows && options.numberOfColumns) return d;
      if (options.numberOfRows < 1 && options.numberOfColumns < 1) throw 'must be a range of some size for rangeList ' + JSON.stringify (options);
      if (!options.numberOfRows) {
        //B1:b10 becoms b1:b
        return d.replace (/(\w+:)([^\d]+).*/,"$1$2");
      }
      if (!options.numberOfColumns) {
        return d.replace (/(\w+:).+?([\d]+).*/,"$1$2");
      }
    });
    
    // this will cause getRanges not to break if there are no ranges
    return columnRanges.length ? 
      sheet.getRangeList (columnRanges) : {
        getRanges: function () {
          return [];
        }
      };
      
    };
  /**
  * @param {[Range]} ranges
  * @return {RangeList}
  */
  self.makeRangeList = function (ranges,options, sheet) {
    
    options = options || {};
    sheet = sheet || sheet_;
    if (!sheet) throw 'sheet must be provided to makeRangeList';
    
    // default options are the whole datarange for each column
    var defOptions = {rowOffset:0,numberOfRows:self.getNumRows(),columnOffset:0,numberOfColumns:1};
    
    // set defaults and check all is good
    Object.keys(defOptions).forEach (function (d) {
      if(typeof options[d] === typeof undefined) options[d] = defOptions[d];
    });
    
    Object.keys(options).forEach (function (d) {
      if(typeof options[d] !== "number" || !defOptions.hasOwnProperty(d) || options[d] < 0 )throw 'invalid property/value option ' + d + options[d] + 'to makeRangeList ';
    });
    
    var r = (ranges || [])
    .map (function (d) {
      return d.getA1Notation();
    })
    .map (function (d) {       // need to treat number of rows (B1:B) or num of columns (c1:1) being 0
      if (options.numberOfRows && options.numberOfColumns) return d;
      if (options.numberOfRows < 1 && options.numberOfColumns < 1) throw 'must be a range of some size for rangeList ' + JSON.stringify (options);
      if (!options.numberOfRows) {
        //B1:b10 becoms b1:b
        return d.replace (/(\w+:)([^\d]+).*/,"$1$2");
      }
      if (!options.numberOfColumns) {
        return d.replace (/(\w+:).+?([\d]+).*/,"$1$2");
      }
      
    });
    
    // this will cause getRanges not to break if there are no ranges
    return r.length ? 
      sheet.getRangeList (r) : {
        getRanges: function () {
          return [];
        }
      };
  };
  
  
  /**
  * get the range required to write the values starting at the given range
  * @param {Range} [range=null] the range
  * @return {Range} the range needed
  */
  self.getRange = function(range) {
    if (!range && !sheet_) throw 'must set a default sheet or specify a range';
    range = range || sheet_.getDataRange();
    // simulate a single cell range for a blank sheet
    return self.getNumColumns() ? range.offset(0, 0, self.getNumRows() + (self.hasHeaders() ? 1 : 0), self.getNumColumns()) : range.offset (0,0,1,1);
  }
  /**
  * move a column before
  * @param {string} header the column name 
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {Fiddler} self
  */
  self.moveColumn = function(header, insertBefore) {
    
    // the headers
    var headers = self.getHeaders();
    var headerPosition = headers.indexOf(header);
    
    if (!header || headerPosition === -1) {
      throw new Error('must supply an existing header of column to move');
    }
    
    // remove from its existing place
    headers.splice(headerPosition, 1);
    
    // the output position
    var columnOffset = insertBefore ? headers.indexOf(insertBefore) : self.getNumColumns();
    // check that the thing is ok to insert before
    if (columnOffset < 0 || columnOffset > self.getNumColumns()) {
      throw new Error(header + ' doesnt exist to insert before');
    }
    
    // insert the column at the requested place
    headers.splice(columnOffset, 0, header);
    
    // adjust the positions
    headerOb_ = headers.reduce(function(p, c) {
      p[c] = Object.keys(p).length;
      return p;
    }, {});
    
    return self;
  };
  
  /**
  * insert a column before
  * @param {string} [header] the column name - undefined if no headers
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {number} the offset if the column that was inserted
  */
  function insertColumn_(header, insertBefore) {
    
    // the headers
    var headers = self.getHeaders();
    
    // the position
    var columnOffset = insertBefore ? headers.indexOf(insertBefore) : self.getNumColumns();
    
    // check ok for header
    if (!self.hasHeaders() && header) {
      throw new Error('this fiddler has no headers - you cant insert a column with a header');
    }
    
    // make one up
    if (!self.hasHeaders()) {
      header = columnLabelMaker_(headers.length + 1);
    }
    
    if (!header) {
      throw new Error('must supply a header for an inserted column');
    }
    if (headers.indexOf(header) !== -1) {
      throw new Error('you cant insert a duplicate header ' + header);
    }
    
    // check that the thing is ok to insert before
    if (columnOffset < 0 || columnOffset > self.getNumColumns()) {
      throw new Error(insertBefore + ' doesnt exist to insert before');
    }
    
    // insert the column at the requested place
    headers.splice(columnOffset, 0, header);
    
    // adjust the positions
    headerOb_ = headers.reduce(function(p, c) {
      p[c] = Object.keys(p).length;
      return p;
    }, {});
    
    // fill in the blanks in the data
    dataOb_.forEach(function(d) {
      d[header] = '';
    });
    
    // clear any formatting in that newly inserted column
    self.setColumnFormat (null , header);
    return columnOffset;
  }
  /**
  * insert a column before
  * @param {string} [header] the column name - undefined if no headers
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {Fiddler} self
  */
  self.insertColumn = function(header, insertBefore) {
    
    // the headers
    insertColumn_(header, insertBefore);
    return self;
    
  }
  
  /**
  * insert a row before
  * @param {number} [rowOffset] starting at 0, undefined for end 
  * @param {number} [numberofRows=1] to add
  * @param {[object]} [data] should be equal to number of Rows
  * @return {Fiddler} self
  */
  self.insertRows = function(rowOffset, numberOfRows, data) {
    if (typeof numberOfRows === typeof undefined) {
      numberOfRows = 1;
    }
    
    // if not defined insert at end
    if (typeof rowOffset === typeof undefined) {
      rowOffset = self.getNumRows();
    }
    
    if (rowOffset < 0 || rowOffset > self.getNumRows()) {
      throw new Error(rowOffset + ' is inalid row to insert before');
    }
    
    for (var i = 0, skeleton = [], apply = [rowOffset, 0]; i < numberOfRows; i++) {
      skeleton.push(makeEmptyObject_());
    }
    
    // maybe we have some data
    if (data) {
      if (!Array.isArray(data)) {
        data = [data];
      }
      if (data.length !== skeleton.length) {
        throw new Error(
          'number of data items ' + data.length +
          ' should equal number of rows ' + skeleton.length + ' to insert ');
      }
      // now merge with skeleton
      skeleton.forEach(function(e, i) {
        
        // override default values
        Object.keys(e).forEach(function(key) {
          if (data[i].hasOwnProperty(key)) {
            e[key] = data[i][key];
          }
        });
        
        // check that no rubbish was specified
        if (Object.keys(data[i]).some(function(d) {
          return !e.hasOwnProperty(d);
        })) {
          throw new Error('unknown columns in row data to insert:' + JSON.stringify(Object.keys(data[i])));
        }
        
      });
    }
    // insert the requested number of rows at the requested place
    dataOb_.splice.apply(dataOb_, apply.concat(skeleton));
    
    return self;
  }
  
  function makeEmptyObject_() {
    return self.getHeaders().reduce(function(p, c) {
      p[c] = ''; // in spreadsheet work empty === null string
      return p;
    }, {});
  }
  /**
  * create a column slice of values
  * @return {object} the column slice
  */
  function columnWise_() {
    // first transpose the data
    return Object.keys(headerOb_).reduce(function(tob, key) {
      tob[key] = self.getColumnValues(key);
      return tob;
    }, {});
  }
  
  /**
  * will create a new dataob with columns dropped that are not in newKeys
  * @param {[string]} newKeys the new headerob keys
  * @return {[object]} the new dataob
  */
  function dropColumns_(newKeys) {
    
    return dataOb_.map(function(row) {
      return Object.keys(row).filter(function(key) {
        return newKeys.indexOf(key) !== -1;
      })
      .reduce(function(p, c) {
        p[c] = row[c];
        return p;
      }, {});
    });
    
  };
  
  /**
  * return the number of rows
  * @return {number} the number of rows of data
  */
  self.getNumRows = function() {
    return dataOb_.length;
  };
  
  /**
  * return the number of columns
  * @return {number} the number of columns of data
  */
  self.getNumColumns = function() {
    return Object.keys(headerOb_).length;
  };
  
  /**
  * check that a variable is a function and throw if not
  * @param {function} [func] optional function to check
  * @return {function} the func
  */
  function checkAFunc(func) {
    if (func && typeof func !== 'function') {
      throw new Error('argument should be a function');
    }
    return func;
  }
  
  /**
  * make column item
  * @param {object} ob the column object
  * @param {string} key the key as returned from a .filter
  * @param {number} idx the index as returned from a .filter
  * @return {object} a columnwise item
  */
  function makeColItem_(ob, key, idx) {
    return {
      values: ob[key],
      columnOffset: idx,
      name: key
    };
  };
  
  /**
  * make row item
  * @param {object} row the row object as returned from a .filter
  * @param {number} idx the index as returned from a .filter
  * @return {object} a rowwise item
  */
  function makeRowItem_(row, idx) {
    return {
      values: Object.keys(headerOb_).map(function(k) {
        return row[k];
      }),
      rowOffset: idx,
      data: row,
      fiddler: self
    };
  };
  
  /**
  * return the headers
  * @return {[string]} the headers
  */
  self.getHeaders = function() {
    return Object.keys(headerOb_);
  };
  
  /**
  * return the data
  * @return {[object]} as rowwise kv pairs 
  */
  self.getData = function() {
    return dataOb_;
  };
  
  /**
  * replace the current data in the fiddle
  * will also update the headerOb
  * @param {[object]} dataOb the new dataOb
  * @param {boolean} [preserveOrder] whether to attempt to preserve existing order of keys
  * @return {Fiddle} self
  */
  self.setData = function(dataOb, preserveOrder) {
    
    // need to calculate new headers
    const proposedHeader = (dataOb || []).reduce(function(hob, row) {
      Object.keys(row).forEach(function(key) {
        if (!hob.hasOwnProperty(key)) {
          hob[key] = Object.keys(hob).length;
        }
      });
      return hob;
    }, {});

    // if the existing header contains the same keys as the original, 
    // then preserve the original order on request
    const ok = Object.keys(proposedHeader);
    const hk = headerOb_ && Object.keys(headerOb_);
    if (!preserveOrder || !hk || hk.length !== ok.length || ok.some(function (t) { return hk.indexOf(t) === -1; })) {
      headerOb_ = proposedHeader
    } 
    // set the new data ob
    dataOb_ = dataOb;
    return self;
  };
  
  /**
  * initialize the header ob and data on from a new values array
  * @return {Fiddle} self
  */
  self.init = function() {
    if (values_) {
      headerOb_ = makeHeaderOb_();
      dataOb_ = makeDataOb_();
    } else {
      headerOb_ = dataOb_ = null;
    }
    return self;
  };
  
  /**
  * @return {boolean} whether a fiddle has headers
  */
  self.hasHeaders = function() {
    return hasHeaders_;
  };
  
  /**
  * set whether a fiddle has headers
  * @param {boolean} headers whether it has
  * @return {Fiddler} self
  */
  self.setHasHeaders = function(headers) {
    hasHeaders_ = !!headers;
    return self.init();
  };
  
  /**
  * set a new values array
  * will also init a new dataob and header
  * @param {[[]]} values as returned from a sheet
  * @return {Fiddler} self
  */
  self.setValues = function(values) {
    values_ = values;
    return self.init();
  };
  
  /**
  * gets the original values stored with this fiddler
  * @return {[[]]} value as needed by setvalues
  */
  self.getValues = function() {
    return values_;
  };
  
  /**
  * gets the updated values derived from this fiddlers dataob
  * @return {[[]]} value as needed by setvalues
  */
  self.createValues = function() {
    return makeValues_();
  };
  
  /**
   * delete all the rows
   */
  self.removeAllRows = function () {
    dataOb_ = [];
    return self;
  };
  /**
  * make a map with column labels to index
  * if there are no headers it will use column label as property key
  * @return {object} a header ob.
  */
  function makeHeaderOb_() {
    
    // headers come from first row normally
    var firstRow = values_ && values_.length ? values_[0] : [];
    // problem is that values in sheets will always be [[""]] for an empty sheet
    // so to avoid interpresting that as a single column with no header
    if (firstRow.length === 1 && firstRow[0] === "") firstRow = [];

    // create headers from firstrow (or generate if no headers)
    var rob=  (self.hasHeaders() ?
               firstRow : firstRow.map(function(d, i) {
                 return columnLabelMaker_(i + 1);
               }))
    .reduce(function(p, c) {
      
      var key = c.toString();
      if (renameBlanks_ && !key) {
        // intercept blank name and use column a notation for it
        key = columnLabelMaker_(Object.keys(p).length + 1 + blankOffset_);
        
      }
      if (p.hasOwnProperty(key)) {
        if (!renameDups_) {
          throw 'duplicate column header ' + key;
        } else {
          // generate a unique name
          var nd = 1;
          while (p.hasOwnProperty(key + nd)) {
            nd++;
          }
          key = key + nd;
        }
      }
      
      p[key] = Object.keys(p).length;
      return p;
    }, {});

    return rob;
    
  }
  
  /**
  * make a map of data
  * @return {object} a data ob.
  */
  function makeDataOb_() {
    
    // get rid of the headers if there are any
    var vals = self.hasHeaders() ? values_.slice(1) : values_;
    
    // make an array of kv pairs
    return headerOb_ ?
      ((vals || []).map(function(row) {
        return Object.keys(headerOb_).reduce(function(p, c) {
          p[c] = row[headerOb_[c]];
          return p;
        }, {})
      })) : null;
  }
  
  /**
  * make values from the dataOb
  * @return {object} a data ob.
  */
  function makeValues_() {
    
    // add the headers if there are any
    var vals = [self.hasHeaders() ? Object.keys(headerOb_) : []];

    // put the kv pairs back to values
    return dataOb_.reduce (function (p,row) {
      Array.prototype.push.apply (p , [vals[0].map (function (d) {
        return typeof row[d] === typeof undefined || row[d] === null ? "" : row[d];
      })]);
      return p;
    },vals);

  }
  
  /**
  * create a column label for sheet address, starting at 1 = A, 27 = AA etc..
  * @param {number} columnNumber the column number
  * @return {string} the address label 
  */
  function columnLabelMaker_(columnNumber, s) {
    s = String.fromCharCode(((columnNumber - 1) % 26) + 'A'.charCodeAt(0)) + (s || '');
    return columnNumber > 26 ? columnLabelMaker_(Math.floor((columnNumber - 1) / 26), s) : s;
  }
  
  // constructor will populate if a sheet is given
  if (sheet) {
    self.populate(sheet);
  }
  
  else if (typeof sheet !== typeof undefined) {
    throw 'sheet was passed in constructor but could not be opened';
  }
  
};
