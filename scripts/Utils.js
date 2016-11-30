
/**
* libary for use with Going Gas Videos
* Utils contains useful functions 
* @namespace
*/
var Utils = (function (ns) {
  /**
  * recursive rateLimitExpBackoff()
  * @param {function} callBack some function to call that might return rate limit exception
  * @param {object} options properties as below
  * @param {number} [attempts=1] optional the attempt number of this instance - usually only used recursively and not user supplied
  * @param {number} [options.sleepFor=750] optional amount of time to sleep for on the first failure in missliseconds
  * @param {number} [options.maxAttempts=5] optional maximum number of amounts to try
  * @param {boolean} [options.logAttempts=true] log re-attempts to Logger
  * @param {function} [options.checker] function to check whether error is retryable
  * @param {function} [options.lookahead] function to check response and force retry (passes response,attemprs)
  * @return {*} results of the callback 
  */
  
  ns.expBackoff = function ( callBack,options,attempts) {
    
    //sleepFor = Math.abs(options.sleepFor ||
    
    options = options || {};
    optionsDefault = { 
      sleepFor:  750,
      maxAttempts:5,                  
      checker:errorQualifies,
      logAttempts:true
    }
    
    // mixin
    Object.keys(optionsDefault).forEach(function(k) {
      if (!options.hasOwnProperty(k)) {
        options[k] = optionsDefault[k];
      }
    });
    
    
    // for recursion
    attempts = attempts || 1;
    
    // make sure that the checker is really a function
    if (typeof(options.checker) !== "function") {
      throw ns.errorStack("if you specify a checker it must be a function");
    }
    
    // check properly constructed
    if (!callBack || typeof(callBack) !== "function") {
      throw ns.errorStack("you need to specify a function for rateLimitBackoff to execute");
    }
    
    function waitABit (theErr) {
      
      //give up?
      if (attempts > options.maxAttempts) {
        throw errorStack(theErr + " (tried backing off " + (attempts-1) + " times");
      }
      else {
        // wait for some amount of time based on how many times we've tried plus a small random bit to avoid races
        Utilities.sleep (
          Math.pow(2,attempts)*options.sleepFor + 
          Math.round(Math.random() * options.sleepFor)
        );
        
      }
    }
    
    // try to execute it
    try {
      var response = callBack(options, attempts);
      
      // maybe not throw an error but is problem nevertheless
      if (options.lookahead && options.lookahead(response,attempts)) {
        if(options.logAttempts) { 
          Logger.log("backoff lookahead:" + attempts);
        }
        waitABit('lookahead:');
        return ns.expBackoff ( callBack, options, attempts+1) ;
        
      }
      return response;
    }
    
    // there was an error
    catch(err) {
      
      if(options.logAttempts) { 
        Logger.log("backoff " + attempts + ":" +err);
      }
      
      // failed due to rate limiting?
      if (options.checker(err)) {
        waitABit(err);
        return ns.expBackoff ( callBack, options, attempts+1) ;
      }
      else {
        // some other error
        throw ns.errorStack(err);
      }
    }
    
    
  }
  
  /**
  * get the stack
  * @param {Error} e the error
  * @return {string} the stack trace
  */
  ns.errorStack = function  (e) {
    try {
      // throw a fake error
      throw new Error();  //x is undefined and will fail under use struct- ths will provoke an error so i can get the call stack
    }
    catch(err) {
      return 'Error:' + e + '\n' + err.stack.split('\n').slice(1).join('\n');
    }
  }
  
  
  // default checker
  function errorQualifies (errorText) {
    
    return ["Exception: Service invoked too many times",
            "Exception: Rate Limit Exceeded",
            "Exception: Quota Error: User Rate Limit Exceeded",
            "Service error:",
            "Exception: Service error:", 
            "Exception: User rate limit exceeded",
            "Exception: Internal error. Please try again.",
            "Exception: Cannot execute AddColumn because another task",
            "Service invoked too many times in a short time:",
            "Exception: Internal error.",
            "User Rate Limit Exceeded",
            "Exception: ???????? ?????: DriveApp.",
            "Exception: Address unavailable",
            "Exception: Timeout"
           ]
    .some(function(e){
      return  errorText.toString().slice(0,e.length) == e  ;
    }) ;
    
  }
  
  
  
  /**
  * convert a data into a suitable format for API
  * @param {Date} dt the date
  * @return {string} converted data
  */
  ns.gaDate = function  (dt) {
    return Utilities.formatDate(
      dt, Session.getScriptTimeZone(), 'yyyy-MM-dd'
    );
  }
  
  /** 
  * execute a regex and return the single match
  * @param {Regexp} rx the regexp
  * @param {string} source the source string
  * @param {string} def the default value
  * @return {string} the match
  */
  ns.getMatchPiece = function (rx, source, def) {
    var f = rx.exec(source);
    
    var result = f && f.length >1 ? f[1] : def;
    
    // special hack for boolean
    if (typeof def === typeof true) {
      result = ns.yesish ( result );
    }
    
    return result;
  };
  
  /** 
  * generateUniqueString
  * get a unique string
  * @param {number} optAbcLength the length of the alphabetic prefix
  * @return {string} a unique string
  **/
  ns.generateUniqueString = function (optAbcLength) {
    var abcLength = ns.isUndefined(optAbcLength) ? 3 : optAbcLength;
    return  (new Date().getTime()).toString(36)  + arbitraryString(abcLength) ;
  };
  
  /** 
  * get an arbitrary alpha string
  * @param {number} length of the string to generate
  * @return {string} an alpha string
  **/
  ns.arbitraryString = function (length) {
    var s = '';
    for (var i = 0; i < length; i++) {
      s += String.fromCharCode(ns.randBetween ( 97,122));
    }
    return s;
  }
  
  /** 
  * randBetween
  * get an random number between x and y
  * @param {number} min the lower bound
  * @param {number} max the upper bound
  * @return {number} the random number
  **/
  ns.randBetween = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  ns.yesish = function(s) {
    var t = s.toString().toLowerCase();
    return t === "yes" || "y" || "true" || "1";
  };
  
  /** 
  * check if item is undefined
  * @param {*} item the item to check
  * @return {boolean} whether it is undefined
  **/
  ns.isUndefined = function (item) {
    return typeof item === 'undefined';
  };
  
  /** 
  * isObject
  * check if an item is an object
  * @param {object} obj an item to be tested
  * @return {boolean} whether its an object
  **/
  ns.isObject = function (obj) {
    return obj === Object(obj);
  };
  
  /** 
  * checksum
  * create a checksum on some string or object
  * @param {*} o the thing to generate a checksum for
  * @return {number} the checksum
  **/
  ns.checksum = function (o) {
    // just some random start number
    var c = 23;
    if (!ns.isUndefined(o)){
      var s =  (ns.isObject(o) || Array.isArray(o)) ? JSON.stringify(o) : o.toString();
      for (var i = 0; i < s.length; i++) {
        c += (s.charCodeAt(i) * (i + 1));
      }
    }
    
    return c;
  };
  
  /**
  * @param {[*]} arguments unspecified number and type of args
  * @return {string} a digest of the arguments to use as a key
  */
  ns.keyDigest = function () {
    
    // conver args to an array and digest them
    return  Utilities.base64EncodeWebSafe (
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,Array.prototype.slice.call(arguments).map(function (d) {
        return (Object(d) === d) ? JSON.stringify(d) : d.toString();
      }).join("-"),Utilities.Charset.UTF_8));
  };
  
  /**
  * creates a  closure function to categorize values
  * @param {...var_arg} arguments takes any number of arguments
  * @return {function} a closure function
  */
  ns.categorize = function (var_arg) {
    
    //convert the arguments to an array after sorting
    var domain_ = Array.prototype.slice.call(arguments);
    
    // prepare some default labels
    var labels_ = domain_.map (function (d,i,a) {
      return (i ? '>= ' + a[i-1] + ' ' : '' ) + '< ' + d ;
    });
    
    // last category
    labels_.push (domain_.length ? ('>= ' + domain_[domain_.length-1]) : 'all');
    
    /**
    * gets the category given a domain
    * @param {*} value the value to categorize
    * @return {number} the index in the domain
    */
    function getCategory (value) {
      var index = 0;
      while (domain_[index] <= value) {
        index++;
      }
      return index;
    }
    
    
    // closure function
    return function (value) { 
      
      return Object.create(null, {
        index:{
          get:function () {
            return getCategory(value);
          }
        },
        label:{
          get:function () {
            return labels_[getCategory(value)];
          }
        },
        labels:{
          get:function () {
            return labels_;
          },
          set:function (newLabels) {
            if (domain_.length !== newLabels.length-1) {
              throw 'labels should be an array of length ' + (domain_.length+1);
            }
            labels_ = newLabels;
          }
        },
        domain:{
          get:function () {
            return domain_;
          }
        },
        toString:{
          value:function (){
            return this.label;
          }
        }
      }); 
    };
  }
  
  /**
  * digest a blob
  * @param {Blob} blob the blob
  * @return {string} the sha1 of the blob
  */
  ns.blobDigest = function(blob) {
    return ns.keyDigest(Utilities.base64Encode(blob.getBytes()));
  };
  
  /**
  * this is clone that will really be an extend
  * @param {object} cloneThis
  * @return {object} a clone
  */
  ns.clone = function (cloneThis) {
    return ns.vanExtend ({} , cloneThis);
  }
  /**
  * recursively extend an object with other objects
  * @param {[object]} obs the array of objects to be merged
  * @return {object} the extended object
  */
  ns.vanMerge = function(obs) {
    return (obs || []).reduce(function(p, c) {
      return ns.vanExtend(p, c);
    }, {});
  };
  /**
  * recursively extend a single obbject with another 
  * @param {object} result the object to be extended
  * @param {object} opt the object to extend by
  * @return {object} the extended object
  */
  ns.vanExtend = function(result, opt) {
    result = result || {};
    opt = opt || {};
    return Object.keys(opt).reduce(function(p, c) {
      // if its an object
      if (ns.isVanObject(opt[c])) {
        p[c] = ns.vanExtend(p[c], opt[c]);
      } else {
        p[c] = opt[c];
      }
      return p;
    }, result);
  };
  /**
  * use a default value if undefined
  * @param {*} value the value to test
  * @param {*} defValue use this one if undefined
  * @return {*} the new value
  */
  ns.fixDef = function(value, defValue) {
    return typeof value === typeof undefined ? defValue : value;
  };
  /**
  * see if something is undefined
  * @param {*} value the value to check
  * @return {bool} whether it was undefined
  */
  ns.isUndefined = function(value) {
    return typeof value === typeof undefined;
  };
  /**
  * simple test for an object type
  * @param {*} the thing to test
  * @return {bool} whether it was an object
  */
  ns.isVanObject = function(value) {
    return typeof value === "object" && !Array.isArray(value);
  }
  
  /**
  * crush for writing to cache.props
  * @param {string} crushThis the string to crush
  * @return {string} the b64 zipped version
  */
  ns.crush = function (crushThis) {
    return Utilities.base64Encode(Utilities.zip ([Utilities.newBlob(JSON.stringify(crushThis))]).getBytes());
  };
  
  /**
  * uncrush for writing to cache.props
  * @param {string} crushed the crushed string
  * @return {string} the uncrushed string
  */
  ns.uncrush = function (crushed) {
    return Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(crushed),'application/zip'))[0].getDataAsString();
  };
  
  /**
  * find disconnected tables in a range of values
  * @nameSpace FindTableRange
  */
  ns.findTableBlocks = function (values, options) {
    
    var MODES = {
      cells:"cells",
      position:"position"
    };
    
    // set default options
    options = ns.vanExtend ({
      mode:MODES.cells,    // how to select the best block
      rank:0,               // if position 1 .. n, 0 (0 is the biggest), if size 1..n, (0 is the biggest)
      rowTolerance:0,      // allow  blank row & column to be part of the data
      columnTolerance:0    
    }, options);
    
    // check the options are good
    options.mode = options.mode.toLowerCase();
    if (!MODES[options.mode]) {
      throw 'invalid mode ' + options.mode + ':mode needs to be one of ' + Object.keys (MODES).map(function(k) { return MODES[k];}).join(",");
    }
    
    if (!values || !Array.isArray(values) || !Array.isArray(values[0])) {
      throw 'values must be an array of arrays as returned by getValues'
    }
    // use a fiddler for reviewing the data
    var fiddler = new Fiddler()
    .setHasHeaders(false)
    .setValues (values.slice())
    
    var headers = fiddler.getHeaders();
    var data = fiddler.getData();
    
    // get all the blank rows and columns, but get rid of any that are sequential
    var blankRows = getBlankRows_ ();
    
    
    //there's an implied blank row & col at the end of the data
    blankRows.push (fiddler.getNumRows());
    
    //
    // find the blocks of non blank data
    var blocks = blankRows.reduce (function (p,c) {
      // the block im working on
      var current = p[p.length-1];
      
      // the number of rows will be the difference between the last start point and the blank row
      current.size.rows = c - current.start.row;
      
      // a row might generate several column chunks
      if (current.size.rows) {

        var columnFiddler = new Fiddler()
        .setHasHeaders(false)
        .setValues(values.slice (current.start.row, current.size.rows + current.start.row));
        
        // get blank columns in this chunk           
        var blankColumns = getBlankColumns_ (columnFiddler);
        blankColumns.push (columnFiddler.getNumColumns());
      }
      else {
        blankColumns = [0];
      }
      
      blankColumns.forEach (function (d,i,a) {
        current.size.columns = d - current.start.column;
        
        if (i<a.length) {
          current = {start:{row:current.start.row ,column:d+1}, size: {rows:current.size.rows , columns:0}};
          p.push(current);
        }
      });
      
      // get ready for next chunk
      var up = {start:{row:c + 1 ,column:0}, size: {rows:0 , columns:0}};
      p.push(up);
      
      return p;
    } , [{start: {row:0,column:0},size:{rows:0,columns:0}}])
    .filter(function (d) {
      // get rid of the ones with no actual size
      return d.size.rows >0 && d.size.columns >0;
    })
    .map (function (d,i) {
      // add some useful things
      d.a1Notation = ns.columnLabelMaker(d.start.column + 1) + (d.start.row +1) + ":" 
      + ns.columnLabelMaker(d.start.column + d.size.columns ) + (d.start.row + d.size.rows);
      d[MODES.cells] = d.size.columns * d.size.rows;
      d[MODES.position] = i;
      return d;
    })
    .sort (function (a,b) {
      return a[options.mode] - b[options.mode];
    });
    
    // this is the preferred one
    var selected = blocks[options.rank ? options.rank -1 : blocks.length -1];
    
    // remove any data we don't need

    fiddler
    .filterRows(function (d, props) {
      return props.rowOffset >= selected.start.row && props.rowOffset < selected.start.row + selected.size.rows;
    })
    .filterColumns(function (d,props) {
      return props.columnOffset >= selected.start.column && props.columnOffset < selected.start.column + selected.size.columns;
    });
   
    return {
      blankRows:blankRows,
      blocks:blocks,
      selected:{
        block:selected,
        values:fiddler.createValues()
      }
    };
    
    // get all the blank rows - will be an array of row indexes
    function getBlankRows_ () {
      return fiddler.getData()
      .map(function (d,i) {
        return i;
      })
      .filter (function (p) {
        return Object.keys(data[p]).every (function (d) {
          return data[p][d] === "";
        });
      })
      .filter (function (d,i,a) {
        // if they are all blank for the row tolerance
        // the the filtered index will be equal to 
        // the current value + rowTolerace
        // but we dont want to tolerate blank leading rows, so they are always blank.
        return a[i+options.rowTolerance] === d+options.rowTolerance || 
          a.slice(0,i+1).every(function(p,j) { return j === p; });
      });

    }
    
    
    //get all the blank columns in each row - will be an array of column indexes
    function getBlankColumns_ (fid) {
      
      var h = fid.getHeaders();
      return h.map(function (d,i) {
        return i;
      })
      .filter(function (p) {
        var uniqueValues = fid.getUniqueValues(headers[p]);
        return !uniqueValues.length || uniqueValues.length === 1 && uniqueValues[0] === "";
      })
      .filter (function (d,i,a) {
        return a[i+options.columnTolerance] === d+options.columnTolerance || 
          a.slice(0,i+1).every(function(p,j) { return j === p; });
      });
     
    }
    
    
  };
  return ns;
}) (Utils || {});
