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
            "Exception: Address unavailable"
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
    return Utilities.base64Encode (
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1,Array.prototype.slice.call(arguments).map(function (d) {
        return (Object(d) === d) ? JSON.stringify(d) : d.toString();
      }).join("-")));
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
  
  return ns;
}) (Utils || {});
