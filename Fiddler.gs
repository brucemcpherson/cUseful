/**
* this is the V8 version
* if you need the legacy version use cUseful.Fiddler
* this is a utility for messing around with 
* values obtained from setValues method 
* of a spreadsheet
* @contructor Fiddler
* @param {Sheet} [sheet=null] populate the fiddler 
*/
function Fiddler(sheet) {

  var self = this;
  var _values,
    _headerOb = null,
    _dataOb = [],
    _empty = true,
    _hasHeaders = true,
    _functions,
    _renameDups = true,
    _renameBlanks = true,
    _blankOffset = 0,
    _sheet = null,
    _headerFormat = {},
    _columnFormats = null,
    _tidyFormats = false,
    _flatOptions = null,
    _formulaOb = null,
    _formulas,
    _custom = null,
    _defaultFlat = {
      flatten: true,
      objectSeparator: ".",
      itemSeparator: ",",
      expandArray: true,
      columns: []
    };

    const _isUndef = (value) => {
      return typeof value === typeof undefined
    }
    const _isNull = (value) => {
      return value === null
    }

    const _isNundef = (value) => _isUndef(value) || _isNull(value)
    const _isObject = (value) => Object(value) === value
    const _isDate = (value) => (value instanceof Date)
    const _forceArray = (item) => Array.isArray(item) ? item : [item]

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
  * .fiddler the fiddler obkect
  */
  var _defaultFunctions = {

    /**
     * used to compare two values
     * @param {*} a itema
     * @param {*} b item b
     * @return {boolean} whether the same
     */
    compareFunc: function (a, b) {
      return a === b;
    },

    /**
    * used to filter rows
    * @param {object} row the row object
    * @param {object} properties properties of this  row
    * @return {boolean} whether to include
    */
    filterRows: function (row, properties) {
      return true;
    },

    /**
    * used to filter columns
    * @param {string} heading the heading text 
    * @param {object} properties properties of this  column
    * @return {boolean} whether to include
    */
    filterColumns: function (heading, properties) {
      return true;
    },

    /**
    * used to change objects rowwise
    * @param {object} row object 
    * @param {object} properties properties of this row
    * @return {object} modified or left as is row 
    */
    mapRows: function (row, properties) {
      return row;
    },

    /**
    * used to change values columnwise
    * @param {[*]} values the values for each row of the column
    * @param {object} properties properties of this column
    * @return {[*]|undefined} values - modified or left as is 
    */
    mapColumns: function (values, properties) {
      return values;
    },

    /**
    * used to change values columnwise in a single column
    * @param {*} value the values for this column/row
    * @param {object} properties properties of this column
    * @return {[*]|undefined} values - modified or left as is 
    */
    mapColumn: function (value, properties) {
      return value;
    },

    /**
    * used to change header values
    * @param {string} name the name of the column
    * @param {object} [properties] properties of this column
    * @return {*} values - modified or left as is 
    */
    mapHeaders: function (name, properties) {
      return name;
    },

    /**
    * returns the indices of matching values in a column
    * @param {*} value the values for this column/row
    * @param {object} properties properties of this columnrang
    * @return {boolean} whether it matches 
    */
    selectRows: function (value, properties) {
      return true;
    }

  };

  // maybe a later version we'll allow changing of default functions
  _functions = _defaultFunctions;



  /**
   * RangeValuePair - an object that contains the range and values
   * @typedef {Object} RangeValuePair
   * @property {string} name - any name for identification(usually a column name)
   * @property {*[[]} values - The  values - ready for use with setValues
   * @property {Range} range - The range it applies to
   */

  /**
   * set a custom value in the fiddler - can be anything
   * @param {*} value value to set
   * @return {Fiddler} self
   */
  self.setCustom = (value) => {
    _custom = value;
    return self;
  }
  /**
   * get a custom value in the fiddler - can be anything
   * @return {*} custom value
   */
  self.getCustom = () => _custom

  /**
   * convert columns to values
   * @param {string|string[]} [columnName] 0 or more column names to process -null is them all
   * @return {RangeValuePair[]} all you need to dump the columns
   */
  self.getDumper = (columnNames) => {
    // first get the rangeList for these columns
    columnNames = _patchColumnNames(columnNames)
    return self.getRangeList(columnNames).getRanges()
      .map((range, i) => {
        const name = columnNames[i]
        return {
          values: _dataOb.map(row => [row[name]]),
          range,
          name
        }
      })
  }
  /**
   * dump columns
   * @param {string|string[]} [columnName] 0 or more column names to process
   * @return {RangeValuePair[]} all you need to dump the columns
   */
  self.dumpColumns = (columnNames, sheet) => self.getDumper(columnNames).map(rp => {
    // first clear the existing data from that column
    const targetSheet = sheet || rp.range.getSheet()
    const rows = targetSheet.getDataRange().getNumRows()
    const range = sheet
      ? targetSheet.getRange(rp.range.getRow(), rp.range.getColumn()).offset(0, 0, rp.range.getNumRows(), rp.range.getNumColumns())
      : rp.range
    if (rows) range.offset(0, 0, rows, range.getNumColumns()).clearContent()

    // the data
    range.setValues(rp.values)
    // the header (if there is one)
    if (self.hasHeaders()) range.offset(-1, 0, 1, 1).setValue(rp.name)
    return {
      ...rp,
      range
    }
  })

  /**
   * get the formulas from the sheet
   * returns {object} self for chaining
   */
  self.needFormulas = () => {
    _formulas = self.getRange().getFormulas()
    _formulaOb = _makeFormulaOb()
    return self
  }


  // make a digest out of anything
  self.fingerprinter = (...args) => {
    // dont allow undefined
    if (_isNundef(args)) throw new Error('fingerprinter doesnt allow undefined or null args')

    // convert args to an array and digest them
    return Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, args.map(d => {
        return _isObject(d) ? (_isDate(d) ? d.getTime() : JSON.stringify(d)) : (_isNundef(d) ? '_nundef_' : d.toString());
      }).join("-"), Utilities.Charset.UTF_8));
  };

  // all about digests for checking for fiddler dirtiness

  const _dirtyList = new Map()
  // this means digest all data
  _dirtyList.set('all', {
    columnNames: null,
    fingerprint: null,
    name: 'all'
  })

  const _checkDirtyWatch = (name) => {
    if (!_dirtyList.has(name)) {
      throw new Error(`${name} doesnt exist as a dirtywatch`)
    }
    return _dirtyList.get(name)
  }

  /**
   * @param {string} name the name to give this dirty list
   * @param {string[]} columnNames the names of the column it applies to
   * @return {object} self
   */
  self.setDirtyWatch = (name, columnNames) => {
    // replacing is allowed
    _dirtyList.set(name, {
      columnNames: _patchColumnNames(columnNames),
      fingerprint: null,
      name
    })
    // set the current fingerprint
    _dirtyList.get(name).fingerprint = self.getFingerprint(name)
    return self
  }

  /**
   * @param {string} name the name to give this dirty list
   * @return {string[]} the columnnames as an array
   */
  self.getDirtyWatch = (name = 'all') => _dirtyList.get(name)

  /**
   * gets a fingerprint for a collection of columns
   * @param {string} [name] the dirtywatch name
   * @return
   */
  self.getFingerprint = (name = 'all') => {
    const ob = _checkDirtyWatch(name)
    if (self.isEmpty()) return null

    // we need the headerOb as well since column positions may have swapped
    return !ob.columnNames ?
      self.fingerprinter(_dataOb, _headerOb) :
      self.fingerprinter(ob.columnNames.map(f => ({
        values: self.getColumnValues(f),
        header: _headerOb[f]
      })))
  }

  /**
   * updates all the fingerprints - should be done when the fiddler data is reset or initialized
   * so the rules are
   * when a fiddler is created it's empty, and its fingerprint is null
   * getFingerprint on an empty will always return null
   * setData && setValues (or resetfingerprints directly) are the only way to reset it to a new value
   * that new value becomes the new initial fingerprint
   * 
   * @return {object} self
   */
  const _resetFingerprints = () => {
    for (let [key, value] of _dirtyList) {
      value.fingerprint = self.getFingerprint(key)
    }
  }

  /**
   * gets a initial for a collection of columns from when the fiddler was first populated
   * @param {string} [name] the dirtywatch name
   * @return
   */
  self.getInitialFingerprint = (name) => self.getDirtyWatch(name).fingerprint

  /**
   * checks if the fiddler is dirty
   * @param {string} [name] see if the fiddler or certain columns are dirty
   * @return {Boolean} whether its dirty
   */
  self.isDirty = (name = 'all') => {
    const ob = _checkDirtyWatch(name)
    return ob.fingerprint !== self.getFingerprint(name) && !_isNull(ob.fingerprint)
  }
  /**
  * @param {Sheet} sheet
  */
  self.setSheet = function (sheet) {
    _sheet = sheet;
    return self;
  };

  /**
  * @return {Sheet} sheet
  */
  self.getSheet = function () {
    return _sheet;
  };



  /// ITERATION FUNCTIONS
  /**
  * iterate through each row - given a specific column
  * @param {string} name the column name
  * @param {function} [func] optional function that shoud true or false if selected
  * @return {number[]} matching row numbers
  */
  self.selectRows = function (name, func) {

    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);
    var result = [];

    // add index if function returns true
    values.forEach(function (d, i) {
      if ((checkAFunc(func) || _functions.selectRows)(d, {
        name: name,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: i,
        columnOffset: columnIndex,
        values: values,
        row: _dataOb[i],
        fiddler: self
      })) result.push(i);
    });

    return result;
  };

  /**
  * iterate through each row - nodifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return a new row if changes made
  * @return {Fiddler} self
  */
  self.mapRows = function (func) {

    _dataOb = _dataOb.map(function (row, rowIndex) {
      var rowLength = Object.keys(row).length;
      var result = (checkAFunc(func) || _functions.mapRows)(row, {
        name: rowIndex,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: rowIndex,
        columnOffset: 0,
        values: self.getHeaders().map(function (k) {
          return row[k];
        }),
        row: row,
        rowFormulas: _formulaOb && _formulaOb[rowIndex],
        fiddler: self
      });

      if (!result || typeof result !== "object") {
        throw new Error("you need to return the row object - did you forget?");
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

  self.setRenameDups = function (rename) {
    _renameDups = rename;
    return self;
  };
  self.setRenameBlanks = function (rename) {
    _renameBlanks = rename;
    return self;
  };
  self.setBlankOffset = function (off) {
    _blankOffset = off;
    return self;
  };

  /**
  * get the unique values in a column
  * @param {string} columnName
  * @param {function} [compareFunc]
  * @return {[*]} array of unique values
  */
  self.getUniqueValues = function (columnName, compareFunc) {

    return self.getColumnValues(columnName)
      .filter(function (d, i, a) {
        return axof_(d, a, compareFunc) === i;
      });

  };

  // like indexof except with custom compare
  function axof_(value, arr, compareFunc) {
    var cf = checkAFunc(compareFunc) || _functions.compareFunc;
    for (var i = 0; i < arr.length; i++) {
      if (cf(value, arr[i])) return i;
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
  self.filterUnique = function (columnNames, keepLast, compareFunc) {

    var headers = self.getHeaders();
    cols = _forceArray(columnNames || headers);

    // may need to reverse
    var data = _dataOb.slice();

    // check params are valid
    if (cols.some(function (d) {
      return headers.indexOf(d) === -1;
    })) {
      throw 'unknown columns in ' + JSON.stringify(cols) + ' compared to ' + JSON.stringify(headers);
    }

    // filter out dups
    data = data.filter(function (d, i, a) {
      // if we're keeping the first one, then keep only if there's none before
      // if the last one, then keep only if there are none following
      var soFar = keepLast ? a.slice(i + 1) : a.slice(0, i);

      return !soFar.some(function (e) {
        return cols.every(function (f) {
          return (checkAFunc(compareFunc) || _functions.compareFunc)(d[f], e[f]);
        });
      });

    });



    // register
    _dataOb = data;
    return self;

  };
  /**
   * set header format
   * @param {object} headerFormat {backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
   * @return self
   */
  self.setHeaderFormat = function (headerFormat) {
    _headerFormat = headerFormat;
    return self;
  };

  /**
   * sort out a list of column names and throw if any invalid
   * @param {string[]} [columnNames] can be an array, single or undefined for all
   * @return {string[]} an array of column names
   */
  function _patchColumnNames(columnNames) {
    // undefined columnNames means them all
    // names can be a single column or an array
    var headers = self.getHeaders();
    columnNames = _isNundef(columnNames) ? headers : _forceArray(columnNames)
    var bad = columnNames.filter(function (d) {
      return headers.indexOf(d) === -1;
    });
    if (bad.length) throw "these columnNames don't exist " + bad.join(",");
    return columnNames;
  }

  /**
   * clear given column formats
   */
  self.clearColumnFormats = function (columnNames) {
    _columnFormats = _columnFormats || {};
    _patchColumnNames(columnNames)
      .forEach(function (d) {
        _columnFormats[d] = null;
      });
    return self;
  };
  /**
   * get all known columnFormats
   */
  self.getColumnFormats = function () {
    return _columnFormats;
  };

  /**
   * set tidy formats
   * @param {boolean} tidyFormats whether to tidy formats in space outside the data being written
   * @return self
   */
  self.setTidyFormats = function (tidyFormats) {
    _tidyFormats = tidyFormats;
    return self;
  };

  /** 
   * this can be handy for chaining 
   */
  self.getSelf = () => self

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
   * @param {string[]} [columnNames=all] default is it applies to all current columns
   * @return self
   */
  self.setColumnFormat = function (columnFormat, columnNames) {
    // validate them
    columnNames = _patchColumnNames(columnNames);
    // a non-null column format means we actually have an interest in columnformats
    _columnFormats = _columnFormats || {};
    // apply them
    columnNames.forEach(function (d) { _columnFormats[d] = columnFormat });
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
    if (atc && atr) {
      // for every format mentioned
      Object.keys(format).forEach(function (f) {
        // check method exists and apply it
        var method = 'set' + f.slice(0, 1).toUpperCase() + f.slice(1).replace(/s$/, "").replace(/ies$/, "y");
        if (typeof range[method] !== "function") throw 'unknown format ' + method;
        range[method](format[f]);
      });
    }
    return self;
  };

  /**
  * applies  formats to a rangelist
  * @param {object} format eg .. {backgrounds:'string',fontColors:'string',wraps:boolean,fontWeights:'string'}
  * @param {Range} rangeList a rangelist
  * @return {range}
  */
  self.setRangelistFormat = function (rangeList, format) {
    // if there's anything to do
    if (rangeList) {
      Object.keys(format).forEach(function (f) {
        var method = 'set' + f.slice(0, 1).toUpperCase() + f.slice(1);
        // patch in case its plural 
        // https://github.com/brucemcpherson/bmFiddler/issues/2 - v29
        method = method.replace(/ies$/, "y").replace(/s$/, "");
        if (typeof rangeList[method] !== "function") throw 'unknown format ' + method;
        rangeList[method](format[f]);
      })
    }
    return self;
  };

  /**
   * apply header formats
   * @param {Range} range the start range for the headers
   * @param {object} [format= _headerFormat] the format object
   * @return self;
   */
  self.applyHeaderFormat = function (range, format) {
    if (!self.getNumColumns()) return self;
    format = format || _headerFormat;
    var rangeList = self.makeRangeList([range.offset(0, 0, 1, self.getNumColumns())], { numberOfRows: 1 }, range.getSheet());
    return self.setRangelistFormat(rangeList, _headerFormat);
  };

  /**
   * apply column formats
   * @param {Range} range the start range
   * @return self;
   */
  self.applyColumnFormats = function (range) {
    var foCollect = [];

    if (_columnFormats) {
      // we'll need this later
      var dr = range.getSheet().getDataRange();
      var atr = dr.getNumRows();
      /// make space for the header
      if (self.hasHeaders() && atr > 1) {
        dr = dr.offset(1, 0, atr - 1);
      }
      if (Object.keys(_columnFormats).length === 0) {
        // this means clear format for entire thing
        dr.clearFormat();
      }
      else {
        // first clear the bottom part of the sheet with no data
        var atr = dr.getNumRows();
        if (atr > self.getNumRows() && self.getNumRows()) {
          dr.offset(self.getNumRows() - atr, 0, atr - self.getNumRows()).clearFormat();
        }

        if (self.getNumRows()) {
          Object.keys(_columnFormats)
            .forEach(function (d) {
              var o = _columnFormats[d];
              // validate still exists
              var h = self.getHeaders().indexOf(d);
              if (h !== -1) {
                // set the range for the data
                var r = dr.offset(0, h, self.getNumRows(), 1);
                if (!o) {
                  // its a clear
                  r.clearFormat();
                }
                else {
                  //self.setFormats  (r, o);
                  foCollect.push({
                    format: o,
                    range: r
                  });
                }
              }
              else {
                // delete it as column is now gone
                delete _columnFormats[d];
              }
            });
        }
      }
    }
    else {
      // there;'s no formatting to do
    }
    // optimize the formatting
    var foNew = foCollect.reduce(function (p, c) {
      // index by the format being set
      var sht = c.range.getSheet();
      var sid = sht.getSheetId();
      Object.keys(c.format)
        .forEach(function (f) {
          var key = f + "_" + c.format[f] + "_" + sid;
          p[key] = p[key] || {
            value: c.format[f],
            format: f,
            ranges: [],
            sheet: sht
          };
          p[key].ranges.push(c.range);
        })
      return p;
    }, {});

    // now make rangelists and apply formats 
    Object.keys(foNew)
      .forEach(function (d) {
        var o = foNew[d];
        // make the range list - they are all ont he same sheet
        var sht = o.sheet;
        var rangeList = sht.getRangeList(o.ranges.map(function (e) { return e.getA1Notation(); }));
        // workout the method (could be pluralized)
        var method = "set" + o.format.slice(0, 1).toUpperCase() + o.format.slice(1).replace(/s$/, "").replace(/ies$/, "y");
        var t = {};
        t[o.format] = o.value;
        if (!rangeList[method]) {
          // fall back to individual ranges
          rangeList.getRanges()
            .forEach(function (e) {
              self.setFormats(e, t);
            });
        }
        else {
          rangeList[method](o.value);
        }
      });

    return self;

  }
  /**
   * get header format
   * @return self
   */
  self.getHeaderFormat = function () {
    return _headerFormat;
  };

  /**
  * iterate through each row - nodifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return true if the row is to be kept
  * @return {Fiddler} self
  */
  self.filterRows = function (func) {

    _dataOb = _dataOb.filter(function (row, rowIndex) {
      return (checkAFunc(func) || _functions.filterRows)(row, {
        name: rowIndex,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: rowIndex,
        columnOffset: 0,
        fiddler: self,
        values: self.getHeaders().map(function (k) {
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
  self.sort = function (name, descending, auxFiddler) {
    if (self.getHeaders().indexOf(name) === -1) {
      throw new Error(name + ' is not a valid header name');
    }
    return self.handySort(self.getData(), {
      values: auxFiddler ? auxFiddler.getData() : null,
      descending: descending,
      extractFunction: function (values, a) {
        return values[a][name];
      }
    });

  };
  /**
   * sort returns sorted values
   * for chaining , can be handy to return the fiddler
   */
  self.sortFiddler = function (name, descending, auxFiddler) {
    var data = self.sort(name, descending, auxFiddler);
    // the true means we try to preserve the order of the original fiddler columns
    // if possible - as self data would normally recreate them according to insert time
    self.setData(data, true, false);
    return self;
  }

  self.handySort = function (displayValues, options) {
    // default comparitor & extractor
    options = options || {};
    var descending = options.descending || false;
    var defaultExtract = function (values, a) {
      return values[a];
    };
    var extractFunc = options.extractFunction || defaultExtract;
    var compareFunc = options.compareFunc || function (a, b) {
      return a > b ? 1 : (a === b ? 0 : -1);
    };

    // allow regular sorting too
    var values = options.values || displayValues;

    if (displayValues.length !== values.length) {
      throw 'value arrays need to be same length';
    }

    return displayValues.map(function (d, i) {
      // make an array of indices
      return i;
    })
      .sort(function (a, b) {
        // sort the according to values the point to
        return compareFunc(
          extractFunc(values, descending ? b : a), extractFunc(values, descending ? a : b)
        );
      })
      .map(function (d) {
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
  self.mapColumn = function (name, func) {

    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);

    values.forEach(function (value, rowIndex) {

      _dataOb[rowIndex][name] = (checkAFunc(func) || _functions.mapColumns)(value, {
        name: name,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: rowIndex,
        columnOffset: columnIndex,
        fiddler: self,
        values: values,
        row: _dataOb[rowIndex],
        fiddler: self
      });

    });

    return self;
  };

  /**
  * iterate through each column - modifies the data in this fiddler instance
  * @param {function} [func] optional function that shoud return new column data
  * @return {Fiddler} self
  */
  self.mapColumns = function (func) {

    var columnWise = _columnWise();
    const columnWiseFormula = _columnWiseFormula
    var oKeys = Object.keys(columnWise);

    oKeys.forEach(function (key, columnIndex) {
      // so we can check for a change
      var hold = columnWise[key].slice();
      var result = (checkAFunc(func) || _functions.mapColumns)(columnWise[key], {
        name: key,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: columnWise[key],
        formulas: columnWiseFormula && columnWiseFormula[key],
        fiddler: self
      });

      // changed no of rows?
      if (!result || result.length !== hold.length) {
        throw new Error(
          'you cant change the number of rows in a column during map items'
        );
      }
      // need to zip through the dataOb and change to new column values
      if (hold.join() !== result.join()) {
        result.forEach(function (r, i) {
          _dataOb[i][key] = r;
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
  self.mapHeaders = function (func) {

    if (!self.hasHeaders()) {
      throw new Error('this fiddler has no headers so you cant change them');
    }

    var columnWise = _columnWise();
    var oKeys = Object.keys(columnWise);
    var nKeys = [];

    oKeys.forEach(function (key, columnIndex) {

      var result = (checkAFunc(func) || _functions.mapHeaders)(key, {
        name: key,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: columnWise[key],
        fiddler: self
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
      _headerOb = {};
      _dataOb = _dataOb.map(function (d) {
        return oKeys.reduce(function (p, c) {
          var idx = Object.keys(p).length;
          _headerOb[nKeys[idx]] = idx;
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
  self.filterColumns = function (func) {
    checkAFunc(func);

    var columnWise = _columnWise();
    var oKeys = Object.keys(columnWise);

    // now filter out any columns
    var nKeys = oKeys.filter(function (key, columnIndex) {
      var result = (checkAFunc(func) || _functions.filterColumns)(key, {
        name: key,
        data: _dataOb,
        headers: _headerOb,
        rowOffset: 0,
        columnOffset: columnIndex,
        fiddler: self,
        values: self.getColumnValues(key),
        fiddler: self
      });
      return result;
    });

    // anything to be deleted?
    if (nKeys.length !== oKeys.length) {
      _dataOb = dropColumns_(nKeys);
      _headerOb = nKeys.reduce(function (p, c) {
        p[c] = Object.keys(p).length;
        return p;
      }, {});
    }
    return self;
  };

  //-----

  const _columnate = (ob, columnName) => {
    if (self.getHeaders().indexOf(columnName) === -1) {
      throw new Error(columnName + ' is not a valid header name');
    }
    // transpose the data
    return ob.map(function (d) {
      return d[columnName];
    });
  }
  /**
  * get the values for a given column
  * @param {string} columnName the given column
  * @return {*[]} the column values
  */
  self.getColumnValues = (columnName) => _columnate(_dataOb, columnName);
  self.getColumnFormulaValues = (columnName) => _formulaOb && _columnate(_formulaOb, columnName);

  /**
  * get the values for a given row
  * @param {number} rowOffset the rownumber starting at 0
  * @return {[*]} the column values
  */
  self.getRowValues = function (rowOffset) {
    // transpose the data
    return headOb_.map(function (key) {
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
  self.copyColumn = function (header, newHeader, insertBefore) {

    // the headers
    var headers = self.getHeaders();
    var headerPosition = headers.indexOf(header);

    if (!header || headerPosition === -1) {
      throw new Error('must supply an existing header of column to move');
    }

    _insertColumn(newHeader, insertBefore);

    // copy the data
    self.mapColumns(function (values, properties) {
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
    self.setSheet(sheet);

    // get the range 
    var range = sheet.getDataRange();

    // set the values
    return self.setValues(range.getValues());

  };

  /**
   * dump values with default values 
   * @param {Sheet} [sheet=null] the start range to dump it to
   * @param {object} options {skipFormats:,skipValues}
   * @return self
   */
  function dump_values(sheet, options) {

    if (!sheet && !_sheet) throw 'sheet not found to dump values to';
    var range = (sheet || _sheet).getDataRange();
    if (!options.skipValues && !options.columnNames) range.clearContent();

    // if we're flattening then we need to do some fiddling with the data
    // TODO .. its a long story because of formatting 
    // do it in next major version

    // we only do something if there's anydata
    var r = self.getRange(range);
    var v = self.createValues();

    // we need to clear any formatting outside the ranges that may have been deleted
    if (_tidyFormats && !options.skipFormats) {
      var rtc = r.getNumColumns();
      var rtr = range.getNumRows();
      var atc = range.getNumColumns();
      var atr = range.getNumRows();
      var rc = atc > rtc && atr ?
        range.offset(0, rtc, atr, atc - rtc).getA1Notation() : "";
      var rr = atr > rtr && atc ?
        range.offset(rtr, 0, atr - rtr).getA1Notation() : "";
      var rl = [];
      if (rc) rl.push(rc);
      if (rr) rl.push(rr);
      if (rl.length) range.getSheet().getRangeList(rl).clearFormat();
    }

    // write out the sheet if there's anything
    if (!options.skipValues && v.length && v[0].length) {
      if (!options.columnNames) {
        r.setValues(v);
      } else {
        // we're doing selected ranges only
        self.dumpColumns(options.columnNames, sheet)
      }
    }

    // do header formats
    if (!options.skipFormats && v[0].length) self.applyHeaderFormat(range);

    // do column formats
    if (!options.skipFormats) self.applyColumnFormats(range);

    return self;
  };
  /**
  * dump values with default values 
  * @param {Sheet} [sheet=null] the start range to dump it to
  * @param {string[]} [columnNames] specific column names to apply
  */
  self.dumpValues = function (sheet, columnNames) {
    return dump_values(sheet, {
      skipFormats: false,
      skipValues: false,
      columnNames
    });
  };
  /**
  * dump values with default values 
  * @param {Sheet} [sheet=null] the start range to dump it to
  */
  self.dumpFormats = function (sheet) {
    return dump_values(sheet, {
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
    return self.getHeaders().indexOf(header);
  };

  /**
   * get the header by index number
   * @param {number} the index number (-1) the last one, -2 2nd last etc
   * @return {string} the header
   */
  self.getHeaderByIndex = function (index) {
    var headers = self.getHeaders();
    return index < 0 ? headers[headers.length + index] : headers[index];
  };

  self.getColumnsWithFormulas = () => {
    if (!self.getFormulaData()) throw new Error(`First use needFormulas() to bring in formulas before changing anything`)

    // now find which columns have any formulas
    return Array.from(self.getHeaders().reduce((p, c) => {
      if (self.getFormulaData().some(f => f[c])) p.add(c)
      return p
    }, new Set()))
  }

  /**
   * get a an a1 type range and add the sheet if required for a group of columns
   * @params {object} args
   * @param {sheet} args.sheet optional sheet if not for the current fiddler sheet
   * @param {string[]} [args.columnNames=*] default is all of them
   * @param {object} [args.options={rowOffset:1,numberOfRows:1,columnOffset:1,numberOfColumns:1}]
   * @param {boolean} [args.includeSheetName = false]
   * @returns {string[]}
   */
  self.getA1s = ({ columnNames, options, sheet, includeSheetName = false }) =>
    self.getRangeList(columnNames, options, sheet)
      .getRanges()
      .map(r => {
        return (includeSheetName ? `'${r.getSheet().getName()}'!` : '') + r.getA1Notation()
      })

  /**
   * get the names of columns occurring between start and finish
   * @param {string} [start=the first one] start column name (or the first one)
   * @param {string} [finish=the last one] finish column name (or the last one)
   * @return {[string]} the columns 
   */
  self.getHeadersBetween = function (start, finish) {
    start = start || self.getHeaderByIndex(0);
    finish = finish || self.getHeaderByIndex(-1);
    startIndex = self.getHeaderIndex(start);
    finishIndex = self.getHeaderIndex(finish);
    if (startIndex === -1) throw 'column ' + start + ' not found';
    if (finishIndex === -1) throw 'column ' + finish + ' not found';
    var [s, f] = [startIndex, finishIndex].sort((a, b) => a - b)
    var list = self.getHeaders().slice(s, f + 1);
    return startIndex > finishIndex ? list.reverse() : list;
  }
  /**
   * get the rangelist for a group of columns
   * @param {sheet} sheet 
   * @param {[string]} [columnNames=*] default is all of them
   * @param {object} [options={rowOffset:1,numberOfRows:1,columnOffset:1,numberOfColumns:1}]
   * @return {RangeList}
   */
  self.getRangeList = function (columnNames, options, sheet) {
    options = options || {};
    sheet = sheet || _sheet;
    if (!sheet) throw 'sheet must be provided to getRangeList';
    var range = self.getRange(sheet.getDataRange());

    // range will point at start point of data
    var atr = range.getNumRows();
    if (self.hasHeaders() && atr > 1) range = range.offset(1, 0, atr - 1);


    // default options are the whole datarange for each column
    var defOptions = { rowOffset: 0, numberOfRows: self.getNumRows(), columnOffset: 0, numberOfColumns: 1 };

    // set defaults and check all is good
    Object.keys(defOptions).forEach(function (d) {
      if (typeof options[d] === typeof undefined) options[d] = defOptions[d];
    });
    Object.keys(options).forEach(function (d) {
      if (typeof options[d] !== "number" || !defOptions.hasOwnProperty(d) || options[d] < 0) throw 'invalid property/value option ' + d + options[d] + 'to getRangeList ';
    });

    ///

    // get the columnnames and expand out as required
    var columnRanges = _patchColumnNames(columnNames)
      .map(function (d) {
        return range.offset(options.rowOffset, _headerOb[d] + options.columnOffset, options.numberOfRows || 2, options.numberOfColumns || 2).getA1Notation();
      })
      .map(function (d) {
        // need to treat number of rows (B1:B) or num of columns (c1:1) being 0
        if (options.numberOfRows && options.numberOfColumns) return d;
        if (options.numberOfRows < 1 && options.numberOfColumns < 1) throw 'must be a range of some size for rangeList ' + JSON.stringify(options);
        if (!options.numberOfRows) {
          //B1:b10 becoms b1:b
          return d.replace(/(\w+:)([^\d]+).*/, "$1$2");
        }
        if (!options.numberOfColumns) {
          return d.replace(/(\w+:).+?([\d]+).*/, "$1$2");
        }
      });

    // this will cause getRanges not to break if there are no ranges
    return columnRanges.length ?
      sheet.getRangeList(columnRanges) : {
        getRanges: function () {
          return [];
        }
      };

  };
  /**
  * @param {[Range]} ranges
  * @return {RangeList}
  */
  self.makeRangeList = function (ranges, options, sheet) {

    options = options || {};
    sheet = sheet || _sheet;
    if (!sheet) throw 'sheet must be provided to makeRangeList';

    // default options are the whole datarange for each column
    var defOptions = { rowOffset: 0, numberOfRows: self.getNumRows(), columnOffset: 0, numberOfColumns: 1 };

    // set defaults and check all is good
    Object.keys(defOptions).forEach(function (d) {
      if (typeof options[d] === typeof undefined) options[d] = defOptions[d];
    });

    Object.keys(options).forEach(function (d) {
      if (typeof options[d] !== "number" || !defOptions.hasOwnProperty(d) || options[d] < 0) throw 'invalid property/value option ' + d + options[d] + 'to makeRangeList ';
    });

    var r = (ranges || [])
      .map(function (d) {
        return d.getA1Notation();
      })
      .map(function (d) {       // need to treat number of rows (B1:B) or num of columns (c1:1) being 0
        if (options.numberOfRows && options.numberOfColumns) return d;
        if (options.numberOfRows < 1 && options.numberOfColumns < 1) throw 'must be a range of some size for rangeList ' + JSON.stringify(options);
        if (!options.numberOfRows) {
          //B1:b10 becoms b1:b
          return d.replace(/(\w+:)([^\d]+).*/, "$1$2");
        }
        if (!options.numberOfColumns) {
          return d.replace(/(\w+:).+?([\d]+).*/, "$1$2");
        }

      });

    // this will cause getRanges not to break if there are no ranges
    return r.length ?
      sheet.getRangeList(r) : {
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
  self.getRange = function (range) {
    if (!range && !_sheet) throw 'must set a default sheet or specify a range';
    range = range || _sheet.getDataRange();
    // simulate a single cell range for a blank sheet
    return self.getNumColumns() ? range.offset(0, 0, self.getNumRows() + (self.hasHeaders() ? 1 : 0), self.getNumColumns()) : range.offset(0, 0, 1, 1);
  }
  /**
  * move a column before
  * @param {string} header the column name 
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {Fiddler} self
  */
  self.moveColumn = function (header, insertBefore) {

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
    _headerOb = headers.reduce(function (p, c) {
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
  function _insertColumn(header, insertBefore) {

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
    _headerOb = headers.reduce(function (p, c) {
      p[c] = Object.keys(p).length;
      return p;
    }, {});

    // fill in the blanks in the data
    _dataOb.forEach(function (d) {
      d[header] = '';
    });

    // clear any formatting in that newly inserted column
    self.setColumnFormat(null, header);
    return columnOffset;
  }
  /**
  * insert a column before
  * @param {string} [header] the column name - undefined if no headers
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {Fiddler} self
  */
  self.insertColumn = function (header, insertBefore) {

    // the headers
    _insertColumn(header, insertBefore);
    return self;

  }

  /**
  * insert a row before
  * @param {number} [rowOffset] starting at 0, undefined for end 
  * @param {number} [numberofRows=1] to add
  * @param {[object]} [data] should be equal to number of Rows
  * @return {Fiddler} self
  */
  self.insertRows = function (rowOffset, numberOfRows, data) {
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
      data = _forceArray(data)

      if (data.length !== skeleton.length) {
        throw new Error(
          'number of data items ' + data.length +
          ' should equal number of rows ' + skeleton.length + ' to insert ');
      }
      // now merge with skeleton
      skeleton.forEach(function (e, i) {

        // override default values
        Object.keys(e).forEach(function (key) {
          if (data[i].hasOwnProperty(key)) {
            e[key] = data[i][key];
          }
        });

        // check that no rubbish was specified
        if (Object.keys(data[i]).some(function (d) {
          return !e.hasOwnProperty(d);
        })) {
          throw new Error('unknown columns in row data to insert:' + JSON.stringify(Object.keys(data[i])));
        }

      });
    }
    // insert the requested number of rows at the requested place
    _dataOb.splice.apply(_dataOb, apply.concat(skeleton));

    return self;
  }

  function makeEmptyObject_() {
    return self.getHeaders().reduce(function (p, c) {
      p[c] = ''; // in spreadsheet work empty === null string
      return p;
    }, {});
  }

  const _cwise = (func) => {
    // first transpose the data
    return Object.keys(_headerOb).reduce(function (tob, key) {
      tob[key] = func(key);
      return tob;
    }, {});
  }
  /**
  * create a column slice of values
  * @return {object} the column slice
  */
  const _columnWise = () => _cwise(self.getColumnValues)
  const _columnWiseFormula = () => _cwise(self.getColumnFormulaValues)

  /**
  * will create a new dataob with columns dropped that are not in newKeys
  * @param {string[]} newKeys the new headerob keys
  * @return {object[]} the new dataob
  */
  function dropColumns_(newKeys) {

    return _dataOb.map(function (row) {
      return Object.keys(row).filter(function (key) {
        return newKeys.indexOf(key) !== -1;
      })
        .reduce(function (p, c) {
          p[c] = row[c];
          return p;
        }, {});
    });

  };

  /**
  * return the number of rows
  * @return {number} the number of rows of data
  */
  self.getNumRows = function () {
    return _dataOb.length;
  };

  /**
  * return the number of columns
  * @return {number} the number of columns of data
  */
  self.getNumColumns = function () {
    return Object.keys(_headerOb).length;
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
      values: Object.keys(_headerOb).map(function (k) {
        return row[k];
      }),
      rowOffset: idx,
      data: row,
      fiddler: self
    };
  };

  /**
  * return the headers
  * @return {string[]} the headers
  */
  self.getHeaders = function () {
    return Object.keys(_headerOb);
  };

  /**
  * return the data
  * @return {object[]} as rowwise kv pairs 
  */
  self.getData = function () {
    return _dataOb;
  };

  /**
  * return the formulas
  * @return {object[]} as rowwise kv pairs 
  */
  self.getFormulaData = function () {
    return _formulaOb;
  };
  /**
  * replace the current data in the fiddle
  * will also update the headerOb
  * @param {object[]} dataOb the new dataOb
  * @param {boolean} [preserveOrder] whether to attempt to preserve existing order of keys
  * @param {boolean} [resetFingerprints] whether to reset the fingerprint
  * @return {Fiddle} self
  */
  self.setData = function (dataOb, preserveOrder, resetFingerprints = true) {

    // need to calculate new headers
    const proposedHeader = (dataOb || []).reduce(function (hob, row) {
      Object.keys(row).forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(hob, key)) {
          hob[key] = Object.keys(hob).length;
        }
      });
      return hob;
    }, {});

    // if the existing header contains the same keys as the original, 
    // then preserve the original order on request
    const ok = Object.keys(proposedHeader);
    const hk = _headerOb && Object.keys(_headerOb);
    if (!preserveOrder || !hk || hk.length !== ok.length || ok.some(function (t) { return hk.indexOf(t) === -1; })) {
      _headerOb = proposedHeader
    }
    // set the new data ob
    _dataOb = dataOb;
    _empty = false;

    // when the dataob is reset, we need to reset the fingerprints to be able to track dirtiness
    if (resetFingerprints) _resetFingerprints()

    return self;
  };

  /**
  * initialize the header ob and data on from a new values array
  * @return {Fiddle} self
  */
  self.init = function () {
    // how to handle multi level dataa
    self.setFlattener(_defaultFlat)

    if (_values) {
      _headerOb = make_headerOb();
      _dataOb = _makeDataOb();
      _empty = false
    } else {
      _headerOb = null;
      _dataOb = [];
      _empty = true;
    }
    return self;
  };

  self.isEmpty = () => _empty

  /**
  * @return {boolean} whether a fiddle has headers
  */
  self.hasHeaders = function () {
    return _hasHeaders;
  };

  /**
  * set whether a fiddle has headers
  * @param {boolean} headers whether it has
  * @return {Fiddler} self
  */
  self.setHasHeaders = function (headers) {
    _hasHeaders = !!headers
    return self.init();
  };

  /**
  * set a new values array
  * will also init a new dataob and header
  * @param {[[]]} values as returned from a sheet
  * @return {Fiddler} self
  */
  self.setValues = function (values) {
    _values = values
    self.init()
    _resetFingerprints()
    return self
  };

  /**
  * gets the original values stored with this fiddler
  * @return {[[]]} value as needed by setvalues
  */
  self.getValues = function () {
    return _values;
  };

  /**
  * gets the updated values derived from this fiddlers dataob
  * @return {[[]]} value as needed by setvalues
  */
  self.createValues = function () {
    return make_values();
  };

  /**
   * delete all the rows
   */
  self.removeAllRows = function () {
    _dataOb = [];
    return self;
  };
  /**
  * make a map with column labels to index
  * if there are no headers it will use column label as property key
  * @return {object} a header ob.
  */
  function make_headerOb() {

    // headers come from first row normally
    var firstRow = _values && _values.length ? _values[0] : [];
    // problem is that values in sheets will always be [[""]] for an empty sheet
    // so to avoid interpresting that as a single column with no header
    if (firstRow.length === 1 && firstRow[0] === "") firstRow = [];

    // create headers from firstrow (or generate if no headers)
    var rob = (self.hasHeaders() ?
      firstRow : firstRow.map(function (d, i) {
        return columnLabelMaker_(i + 1);
      }))
      .reduce(function (p, c) {

        var key = c.toString();
        if (_renameBlanks && !key) {
          // intercept blank name and use column a notation for it
          key = columnLabelMaker_(Object.keys(p).length + 1 + _blankOffset);

        }
        if (p.hasOwnProperty(key)) {
          if (!_renameDups) {
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
  * make a map of data and formulas
  * @return {object} a data ob.
  */
  function _makeOb(values) {

    // get rid of the headers if there are any
    var vals = self.hasHeaders() ? values.slice(1) : values;

    // make an array of kv pairs
    return _headerOb ?
      ((vals || []).map(function (row) {
        return Object.keys(_headerOb).reduce(function (p, c) {
          p[c] = row[_headerOb[c]];
          return p;
        }, {})
      })) : null;
  }

  /**
  * make a map of data and formulas
  * @return {object} a data ob.
  */
  const _makeDataOb = () => _makeOb(_values)
  const _makeFormulaOb = () => _makeOb(_formulas)



  /**
  * make values from the dataOb
  * @return {object} a data ob.
  */
  function make_values() {

    // add the headers if there are any
    var vals = [self.hasHeaders() ? Object.keys(_headerOb) : []];

    // put the kv pairs back to values
    return _dataOb.reduce(function (p, row) {
      Array.prototype.push.apply(p, [vals[0].map(function (d) {
        return typeof row[d] === typeof undefined || row[d] === null ? "" : row[d];
      })]);
      return p;
    }, vals);

  }

  /**
  * create a column label for sheet address, starting at 1 = A, 27 = AA etc..
  * @param {number} columnNumber the column 
  * @param {string} [s] the recursive result
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


  /**
   * @typdef JoinHand
   * @property {[*]} data the array of data to join
   * @property {function} [makeKey] function to take a row and make a key
   * @property {function} [makeColumnName] function to rename a column name - default is to retain (dups would be dropped)
   * 
   */

  /**
   * default function to compare keys
   * @param {*} a the first key
   * @param {*} b the second key
   * @returns {boolean} whether they should be treated as equal
   */
  const _defaultJoinCompareKeys = ((a, b) => a === b)

  /**
   * default function to make key 
   * @param {object} row the input row
   * @returns {*} the made key
   */
  const _defaultJoinMakeKey = (row) => {
    if (typeof row.id === typeof undefined) throw new Error('row.id was undefined using default _defaultJoinMakeKey')
    return row.id
  }


  const _joinTypes = ['inner', 'full', 'left', 'right']

  /**
   * merge 2 sets of data
   * @param {object} join
   * @param {JoinHand} join.left definition 
   * @param {JoinHand} join.right definition 
   * @param {function} [join.compareKeys] function to compare keys from makekey
   * @param {string} [join.joinType='inner'] 'inner' | 'outer' | 'left' | 'right'
   * @returns {object[]} a new set of data that can be used with getData() to create a new fiddler 
   */

  self.join = ({
    left,
    right,
    compareKeys = _defaultJoinCompareKeys,
    joinType = 'inner'
  }) => {
    const makeKey = (a, aRow) => (a.makeKey || _defaultJoinMakeKey)(aRow)
    const compare = (a, b, aRow, bRow) => compareKeys(makeKey(a, aRow), makeKey(b, bRow))
    const renamer = (a, aRow) => a.makeColumnName ? Object.keys(aRow).reduce((p, c) => {
      p[a.makeColumnName(c)] = aRow[c]
      return p
    }, {}) : aRow

    // TODO - rename column name clashes
    const pusher = (a, b, outer = false, reverse = false) => {
      return a.data.reduce((p, aRow) => {
        const matches = b.data.filter(bRow => reverse ? compare(b, a, bRow, aRow) : compare(a, b, aRow, bRow))
        if (matches.length) {
          matches.forEach(match => p.push({
            ...renamer(a, aRow),
            ...renamer(b, match)
          }))
        } else if (outer) {
          p.push({
            ...renamer(a, aRow)
          })
        }
        return p;
      }, [])
    }


    // todo - rename propertyname clash
    if (joinType === 'inner') {
      return pusher(left, right)
    }

    else if (joinType === 'left') {
      return pusher(left, right, true)
    }

    else if (joinType === 'right') {
      return pusher(right, left, true, true)
    }

    else if (joinType === 'full') {
      // first to a left join
      const p = pusher(left, right, true)
      // now we need to mop up the right who didn't make it
      return p.concat(right.data
        .filter(rightRow => !left.data.some(leftRow => compare(left, right, leftRow, rightRow)))
        .map(rightRow => ({
          ...renamer(right, rightRow)
        })))
    }

    else {
      throw new Error(`${joinType} should be one of ${_joinTypes.join(",")}`)
    }

  }

};
