/**
* this is a utility for messing around with 
* values obtained from setValues method 
* of a spreadsheet
* @contructor Fiddler
*/
var Fiddler = function () {
  
  var self = this;
  var values_, 
      headerOb_ , 
      dataOb_=[],
      hasHeaders_ = true,
      functions_;
  
  
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
    filterColumns:function (heading , properties) {
      return true;
    },
    
     /**
     * used to change objects rowwise
     * @param {object} row object 
     * @param {object} properties properties of this row
     * @return {object} modified or left as is row 
     */
    mapRows: function (row , properties) {
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
     * @param {object} properties properties of this column
     * @return {[*]|undefined} values - modified or left as is 
     */
    mapHeaders: function (name, properties) {
      return name;
    },
    
    /**
     * returns the indices of matching values in a column
     * @param {*} value the values for this column/row
     * @param {object} properties properties of this column
     * @return {boolean} whether it matches 
     */
    selectRows: function (value , properties) {
      return true;
    }

  }; 
  
  // maybe a later version we'll allow changing of default functions
  functions_ = defaultFunctions_;

  /// ITERATION FUNCTIONS
  /**
   * iterate through each row - given a specific column
   * @param {string} name the column name
   * @param {function} [func] optional function that shoud true or false if selected
   * @return {Fiddler} self
   */
  self.selectRows = function (name, func) {
    
    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);
    var result = [];
    
    // add index if function returns true
    values.forEach (function(d,i) {
      if ((checkAFunc (func) || functions_.selectRows)(d, {
        name:name,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:i,
        columnOffset:columnIndex,
        fiddler:self,
        values:values,
        row:dataOb_[i]
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

    dataOb_ = dataOb_.map(function (row,rowIndex) {      
      var result = (checkAFunc (func) || functions_.mapRows)(row, {
        name:rowIndex,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:rowIndex,
        columnOffset:0,
        fiddler:self,
        values:self.getHeaders().map(function(k) { return row[k]; }),
        row:row
      });
      
      if (!result || result.length !== row.length) {
        throw new Error(
          'you cant change the number of columns in a row during map items'
        );
      }
      return result;
    });
    
    return self;
  };

  /**
   * iterate through each row - nodifies the data in this fiddler instance
   * @param {function} [func] optional function that shoud return true if the row is to be kept
   * @return {Fiddler} self
   */
  self.filterRows = function (func) {

    dataOb_ = dataOb_.filter(function (row,rowIndex) {
      return (checkAFunc (func) || functions_.filterRows)(row, {
        name:rowIndex,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:rowIndex,
        columnOffset:0,
        fiddler:self,
        values:self.getHeaders().map(function(k) { return row[k]; }),
        row:row
      });
    });
    return self;
  };
 /**
   * iterate through each column - modifies the data in this fiddler instance
   * @param {string} name the name of the column
   * @param {function} [func] optional function that shoud return new column data
   * @return {Fiddler} self
   */
  self.mapColumn = function (name,func) {

    var values = self.getColumnValues(name);
    var columnIndex = self.getHeaders().indexOf(name);
        
    values.forEach (function (value,rowIndex) {

      dataOb_[rowIndex][name] = (checkAFunc (func) || functions_.mapColumns)(value, {
        name:name,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:rowIndex,
        columnOffset:columnIndex,
        fiddler:self,
        values:values,
        row:dataOb_[rowIndex]
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

    var columnWise = columnWise_ ();
    var oKeys = Object.keys(columnWise);
    
    oKeys.forEach (function (key,columnIndex) {
      // so we can check for a change
      var hold = columnWise[key].slice();
      var result = (checkAFunc (func) || functions_.mapColumns)(columnWise[key], {
        name:key,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:0,
        columnOffset:columnIndex,
        fiddler:self,
        values:columnWise[key]
      });
      
      // changed no of rows?
      if (!result || result.length !== hold.length) {
        throw new Error(
          'you cant change the number of rows in a column during map items'
        );
      }
      // need to zip through the dataOb and change to new column values
      if (hold.join() !== result.join()) {
        result.forEach(function(r,i) {
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
  self.mapHeaders = function (func) {
    
    if (!self.hasHeaders()) {
      throw new Error('this fiddler has no headers so you cant change them');
    }
    
    var columnWise = columnWise_ ();
    var oKeys = Object.keys(columnWise);
    var nKeys = [];
    
    oKeys.forEach (function (key,columnIndex) {
      
      var result = (checkAFunc (func) || functions_.mapHeaders)(key, {
        name:key,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:0,
        columnOffset:columnIndex,
        fiddler:self,
        values:columnWise[key]
      });
      
      // deleted the header
      if (!result) {
        throw new Error(
          'header cant be blank'
        );
      }
      
      nKeys.push (result);
    });

    
    // check for change
    if (nKeys.join() !== oKeys.join()){
      headerOb_ = {};
      dataOb_ = dataOb_.map(function(d) {
        return oKeys.reduce(function(p,c) {
          var idx = Object.keys(p).length;
          headerOb_[nKeys[idx]] = idx;
          p[nKeys[idx]] = d[c];
          return p;
        },{});
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
    checkAFunc (func);
    
    var columnWise = columnWise_ ();
    var oKeys = Object.keys(columnWise);
    
    // now filter out any columns
    var nKeys = oKeys.filter(function (key,columnIndex) {
      var result = (checkAFunc (func) || functions_.filterColumns)(key, {
        name:key,
        data:dataOb_,
        headers:headerOb_,
        rowOffset:0,
        columnOffset:columnIndex,
        fiddler:self,
        values:self.getColumnValues(key)
      });
      return result;
    });
    
    // anything to be deleted?
    if (nKeys.length !== oKeys.length) {
      dataOb_ = dropColumns_ (nKeys);
      headerOb_ = nKeys.reduce(function(p,c) {
        p[c] = Object.keys(p).length;
        return p;
      } ,{});
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
    if (self.getHeaders().indexOf(columnName) === -1 ) {
      throw new Error (columnName + ' is not a valid header name');
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
  self.getRowValues = function (rowOffset) {
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
  self.copyColumn = function (header, newHeader, insertBefore) {
    
    // the headers
    var headers = self.getHeaders();
    var headerPosition = headers.indexOf(header);
    
    if (!header || headerPosition === -1) {
      throw new Error ('must supply an existing header of column to move');
    }
    
    var columnOffset = insertColumn_ (newHeader, insertBefore);
    
    // copy the data
    self.mapColumns(function (values , properties) {
      return properties.name === newHeader ? self.getColumnValues(header) : values;
    });

    return self;
  };
   
  /**
  * get the range required to write the values starting at the given range
  * @param {Range} range the range
  * @return {Range} the range needed
  */
  self.getRange = function (range) {
    return range.offset (0,0,self.getNumRows() + (self.hasHeaders() ? 1 : 0) , self.getNumColumns()); 
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
      throw new Error ('must supply an existing header of column to move');
    }
    
    // remove from its existing place
    headers.splice ( headerPosition , 1);
    
    // the output position
    var columnOffset = insertBefore ? headers.indexOf (insertBefore) : self.getNumColumns();
    // check that the thing is ok to insert before
    if (columnOffset < 0 || columnOffset > self.getNumColumns() ) {
      throw new Error (header + ' doesnt exist to insert before');
    }
    
    // insert the column at the requested place
    headers.splice ( columnOffset , 0, header);
    
    // adjust the positions
    headerOb_ = headers.reduce(function(p,c) {
      p[c] = Object.keys(p).length;
      return p;
    } , {});
    
    
    return self;
  };
  
 /**
  * insert a column before
  * @param {string} [header] the column name - undefined if no headers
  * @param {string} [insertBefore] name of the header to insert befire, undefined for end 
  * @return {number} the offset if the column that was inserted
  */
  function insertColumn_  (header, insertBefore) {
    
    // the headers
    var headers = self.getHeaders();
    
    // the position
    var columnOffset = insertBefore ? headers.indexOf (insertBefore) : self.getNumColumns();
    
    // check ok for header
    if (!self.hasHeaders() && header) {
      throw new Error ('this fiddler has no headers - you cant insert a column with a header');
    }
    
    // make one up
    if (!self.hasHeaders()) {
      header = columnLabelMaker_ (headers.length + 1);
    }
    
    if (!header) {
      throw new Error ('must supply a header for an inserted column');
    }
    if (headers.indexOf (header) !== -1 ) {
      throw new Error ('you cant insert a duplicate header ' + header);
    }
    
    // check that the thing is ok to insert before
    if (columnOffset < 0 || columnOffset > self.getNumColumns() ) {
      throw new Error (header + ' doesnt exist to insert before');
    }

    // insert the column at the requested place
    headers.splice ( columnOffset , 0, header);
    
    // adjust the positions
    headerOb_ = headers.reduce(function(p,c) {
      p[c] = Object.keys(p).length;
      return p;
    } , {});
    
    // fill in the blanks in the data
    dataOb_.forEach(function(d) {
      d[header] = '';
    });
    
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
    insertColumn_ (header, insertBefore);
    return self;
  
  }
  
  
  /**
  * insert a row before
  * @param {number} [rowOffset] starting at 0, undefined for end 
  * @param {number} [numberofRows=1] to add
  * @param {[object]} [data] should be equal to number of Rows
  * @return {Fiddler} self
  */
  self.insertRows = function (rowOffset,numberOfRows, data) {
    if (typeof numberOfRows === typeof undefined) {
      numberOfRows = 1;
    }
    
    // if not defined insert at end
    if (typeof rowOffset === typeof undefined) {
      rowOffset = self.getNumRows();
    }
    
    if (rowOffset < 0 || rowOffset > self.getNumRows() ) {
      throw new Error (rowOffset + ' is inalid row to insert before');
    }

    for (var i =0, skeleton = [], apply = [rowOffset,0] ; i < numberOfRows ; i++) {
      skeleton.push (makeEmptyObject_());
    }
                                      
    // maybe we have some data
    if (data) {
      if (!Array.isArray(data)) {
        data = [data];
      }
      if (data.length !== skeleton.length) {
        throw new Error (
          'number of data items ' + data.length +  
          ' should equal number of rows ' + skeleton.length +' to insert ' );
      }
      // now merge with skeleton
      skeleton.forEach(function(e,i) {
        
        // override default values
        Object.keys (e).forEach(function (key) {
          if (data[i].hasOwnProperty(key)) {
            e[key] = data[i][key];
          }
        });
        
        // check that no rubbish was specified
        if (Object.keys(data[i]).some(function(d) { 
          return !e.hasOwnProperty (d);
        })) { 
          throw new Error('unknown columns in row data to insert'); 
        }
                       
      });
    }
    // insert the requested number of rows at the requested place
    dataOb_.splice.apply (dataOb_ , apply.concat(skeleton));
    
    return self;
  }
  
  function makeEmptyObject_ () {
    return self.getHeaders().reduce(function (p,c) {
      p[c] = ''; // in spreadsheet work empty === null string
      return p;
    },{});
  }
  /**
  * create a column slice of values
  * @return {object} the column slice
  */
  function columnWise_ () {
    // first transpose the data
    return Object.keys(headerOb_).reduce (function (tob , key) {
      tob[key] = self.getColumnValues(key);
      return tob;
    },{});
  }
  
 
 
  /**
   * will create a new dataob with columns dropped that are not in newKeys
   * @param {[string]} newKeys the new headerob keys
   * @return {[object]} the new dataob
   */
  function dropColumns_ (newKeys) {

    return dataOb_.map(function(row) {
      return Object.keys(row).filter (function (key) {
        return newKeys.indexOf(key) !== -1;
      })
      .reduce (function (p,c) {
        p[c] = row[c];
        return p;
      },{});
    });
  
  };
  
  /**
  * return the number of rows
  * @return {number} the number of rows of data
  */
  self.getNumRows = function () {
    return dataOb_.length;
  };
  
  /**
  * return the number of columns
  * @return {number} the number of columns of data
  */
  self.getNumColumns = function () {
    return Object.keys(headerOb_).length;
  };
  
  /**
   * check that a variable is a function and throw if not
   * @param {function} [func] optional function to check
   * @return {function} the func
   */
  function checkAFunc (func) {
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
  function makeColItem_ (ob,key,idx) {
    return {
      values:ob[key],
      columnOffset:idx,
      name:key
    };
  };
  
  /**
   * make row item
   * @param {object} row the row object as returned from a .filter
   * @param {number} idx the index as returned from a .filter
   * @return {object} a rowwise item
   */  
  function makeRowItem_ (row,idx) {
    return {
      values:Object.keys(headerOb_).map(function(k) { return row[k]; }),
      rowOffset:idx,
      data:row,
      fiddler:self
    };
  };

  
  /**
  * return the headers
  * @return {[string]} the headers
  */
  self.getHeaders = function () {
    return Object.keys(headerOb_);
  };
  
  /**
  * return the data
  * @return {[object]} as rowwise kv pairs 
  */
  self.getData = function () {
    return dataOb_;
  };
  
  /**
  * replace the current data in the fiddle
  * will also update the headerOb
  * @param {[object]} dataOb the new dataOb
  * @return {Fiddle} self
  */
  self.setData = function  (dataOb) {
    
    // need to calculate new headers
    headerOb_ = dataOb.reduce(function(hob,row) {
      Object.keys(row).forEach(function(key) {
        if (!hob.hasOwnProperty(key)) {
          hob[key] = Object.keys(hob).length;
        }
      });
      return hob;
    } , {});
    dataOb_ = dataOb;
    return self;
  };
  
  /**
   * initialize the header ob and data on from a new values array
   * @return {Fiddle} self
   */
  self.init = function () {
    headerOb_ = makeHeaderOb_();
    dataOb_ = makeDataOb_();
    return self;
  };
  
  /**
  * @return {boolean} whether a fiddle has headers
  */
  self.hasHeaders = function () {
    return hasHeaders_;
  };
  
  /**
  * set whether a fiddle has headers
  * @param {boolean} headers whether it has
  * @return {Fiddler} self
  */
  self.setHasHeaders = function (headers) {
    hasHeaders_ = !!headers ;
    return self.init();
  };
  
  /**
   * set a new values array
   * will also init a new dataob and header
   * @param {[[]]} values as returned from a sheet
   * @return {Fiddler} self
   */
  self.setValues = function (values) {
    values_= values;
    return self.init();
  };
  
  /**
   * gets the original values stored with this fiddler
   * @return {[[]]} value as needed by setvalues
   */
  self.getValues = function () {
    return values_;
  };
  
  /**
   * gets the updated values derived from this fiddlers dataob
   * @return {[[]]} value as needed by setvalues
   */
  self.createValues = function () {
    return makeValues_();
  };
  
  /**
   * make a map with column labels to index
   * if there are no headers it will use column label as property key
   * @return {object} a header ob.
   */
  function makeHeaderOb_ () {
    
    return values_.length ? 
      ((self.hasHeaders() ? 
       values_[0] : values_[0].map(function(d,i) {
         return columnLabelMaker_ (i+1);
       }))
    .reduce (function (p,c) {
      var key = c.toString();
      if (p.hasOwnProperty(key)) {
        throw 'duplicate column header ' + key;
      }
      p[key]=Object.keys(p).length;
      return p;
    },{})) : null;
    
  }
  
  /**
   * make a map of data
   * @return {object} a data ob.
   */
  function makeDataOb_ () {
    
    // get rid of the headers if there are any
    var vals = self.hasHeaders() ? values_.slice(1) : values_;
    
    // make an array of kv pairs
    return headerOb_ ? 
      ( (vals|| []).map (function (row) {
        return Object.keys(headerOb_).reduce(function (p,c) {
          p[c] = row [headerOb_[c]];
          return p;
        },{})
      })) : null;
  }
  
  /**
   * make values from the dataOb
   * @return {object} a data ob.
   */
  function makeValues_ () {

    // add the headers if there are any
    var vals = self.hasHeaders() ? [Object.keys(headerOb_)] : [];
    
    // put the kv pairs back to values
    dataOb_.forEach(function(row) {
      vals.push (Object.keys(headerOb_).reduce(function(p,c){
        p.push(row[c]);
        return p;
      },[]));
    });
    
    return vals;
  }
  
  /**
  * create a column label for sheet address, starting at 1 = A, 27 = AA etc..
  * @param {number} columnNumber the column number
  * @return {string} the address label 
  */
  function columnLabelMaker_ (columnNumber,s) {
    s = String.fromCharCode(((columnNumber-1) % 26) + 'A'.charCodeAt(0)) + ( s || '' );
    return columnNumber > 26 ? columnLabelMaker_ ( Math.floor( (columnNumber-1) /26 ) , s ) : s;
  }
  
  
  
  
};