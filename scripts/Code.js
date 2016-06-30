/** useful functions
 * cUseful
 **/
 
"use strict";

/** 
 * used for dependency management
 * @return {LibraryInfo} the info about this library and its dependencies
 */
function getLibraryInfo () {
  return {
    info: {
      name:'cUseful',
      version:'2.2.35',
      key:'Mcbr-v4SsYKJP7JMohttAZyz3TLx7pV4j',
      share:'https://script.google.com/d/1EbLSESpiGkI3PYmJqWh3-rmLkYKAtCNPi1L2YCtMgo2Ut8xMThfJ41Ex/edit?usp=sharing',
      description:'various dependency free useful functions'
    }
  }; 
}

/**
 * test for a date object
 * @param {*} ob the on to test
 * @return {boolean} t/f
 */
function isDateObject (ob) {
  return isObject(ob) && ob.constructor && ob.constructor.name === "Date";
}

/**
 * test a string is an email address
 * from http://www.regular-expressions.info/email.html
 * @param {string} emailAddress the address to be tested
 * @return {boolean} whether it is and email address
 */
function isEmail (emailAddress) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(emailAddress);
}
/**
 * used to create a random 2 dim set of values for a sheet
 * @param {number} [rows=10] number of rows to generate
 * @param {number} [columns=8] number of columns to generate
 * @param {number} [min=0] minimum number of characeters per cell
 * @param {number} [max=20] maximum number of characters per cell
 * @return {String[][]} values for sheet or docs tabe
 */
function getRandomSheetStrings (rows,columns,min,max) {
  min = typeof min == typeof undefined ?  2 : min;
  max = typeof max == typeof undefined ?  20 : max;
  rows = typeof rows == typeof undefined ?  2 : rows;
  columns = typeof columns == typeof undefined ?  20 : columns;
  
  return new Array(rows).join(',').split(',').map (function() {
    return new Array (columns).join(',').split(',').map(function() {
      var size = Math.floor(Math.random() * (max- min + 1)) + min;
      return size ? new Array(size).join(',').split(',').map(function() {
        var s = String.fromCharCode(Math.floor(Math.random() * (0x7E - 0x30 + 1)) + 0x30); 
        // don't allow = as 1st character
        if (s.slice(0,1) === '=') s = 'x' + s.slice(1);
        return s;
      }).join('') : '';
    });
  });
}
/** 
 * generateUniqueString
 * get a unique string
 * @param {number} optAbcLength the length of the alphabetic prefix
 * @return {string} a unique string
 **/
function generateUniqueString (optAbcLength) {
  var abcLength = isUndefined(optAbcLength) ? 3 : optAbcLength;
  return  (new Date().getTime()).toString(36)  + arbitraryString(abcLength) ;
}

/** 
 * check if item is undefined
 * @param {*} item the item to check
 * @return {boolean} whether it is undefined
 **/
function isUndefined (item) {
  return typeof item === 'undefined';
}

/** 
 * check if item is undefined
 * @param {*} item the item to check
 * @param {*} defaultValue the default value if undefined
 * @return {*} the value with the default applied
 **/
function applyDefault (item,defaultValue) {
  return isUndefined(item) ? defaultValue : item;
} 


/** 
 * get an arbitrary alpha string
 * @param {number} length of the string to generate
 * @return {string} an alpha string
 **/
function arbitraryString (length) {
  var s = '';
  for (var i = 0; i < length; i++) {
    s += String.fromCharCode(randBetween ( 97,122));
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
function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 
 * checksum
 * create a checksum on some string or object
 * @param {*} o the thing to generate a checksum for
 * @return {number} the checksum
 **/
function checksum(o) {
  // just some random start number
  var c = 23;
  if (!isUndefined(o)){
    var s =  (isObject(o) || Array.isArray(o)) ? JSON.stringify(o) : o.toString();
    for (var i = 0; i < s.length; i++) {
      c += (s.charCodeAt(i) * (i + 1));
    }
  }
  
  return c;
}
  
/** 
 * isObject
 * check if an item is an object
 * @memberof DbAbstraction
 * @param {object} obj an item to be tested
 * @return {boolean} whether its an object
 **/
function isObject (obj) {
  return obj === Object(obj);
}

/** 
 * clone
 * clone an object by parsing/stringifyig
 * @param {object} o object to be cloned
 * @return {object} the clone
 **/
function clone (o) {
  return o ? JSON.parse(JSON.stringify(o)) : null;
};

/**
 * recursive rateLimitExpBackoff()
 * @param {function} callBack some function to call that might return rate limit exception
 * @param {number} [sleepFor=750] optional amount of time to sleep for on the first failure in missliseconds
 * @param {number} [maxAttempts=5] optional maximum number of amounts to try
 * @param {number} [attempts=1] optional the attempt number of this instance - usually only used recursively and not user supplied
 * @param {boolean} [optLogAttempts=false] log re-attempts to Logger
 * @param {function} [optchecker] function should throw an error "force backoff" if you want to force a retry
 * @return {*} results of the callback 
 */
var TRYAGAIN = "force backoff anyway";
function rateLimitExpBackoff ( callBack, sleepFor ,  maxAttempts, attempts , optLogAttempts , optChecker) {

  // can handle multiple error conditions by expanding this list
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
            "Exception: ???????? ?????: DriveApp.",
            "User Rate Limit Exceeded",
            TRYAGAIN

           ]
            .some(function(e){
              return  errorText.toString().slice(0,e.length) == e  ;
            });
  }
  
  
  // sleep start default is  .75 seconds
  sleepFor = Math.abs(sleepFor || 750);
  
  // attempt number
  attempts = Math.abs(attempts || 1);
  
  // maximum tries before giving up
  maxAttempts = Math.abs(maxAttempts || 5);
  
  // make sure that the checker is really a function
  if (optChecker && typeof(callBack) !== "function") {
    throw errorStack("if you specify a checker it must be a function");
  }
  
  // check properly constructed
  if (!callBack || typeof(callBack) !== "function") {
    throw ("you need to specify a function for rateLimitBackoff to execute");
  }
  
  // try to execute it
  else {
    
    try {

      var r = callBack();
      
      // this is to find content based errors that might benefit from a retry
      return optChecker ? optChecker(r) : r;
      
    }
    catch(err) {
    
      if(optLogAttempts)Logger.log("backoff " + attempts + ":" +err);
      // failed due to rate limiting?
      if (errorQualifies(err)) {
        
        //give up?
        if (attempts > maxAttempts) {
          throw errorStack(err + " (tried backing off " + (attempts-1) + " times");
        }
        else {
          
          // wait for some amount of time based on how many times we've tried plus a small random bit to avoid races
          Utilities.sleep (Math.pow(2,attempts)*sleepFor + (Math.round(Math.random() * sleepFor)));
          
          // try again
          return rateLimitExpBackoff ( callBack, sleepFor ,  maxAttempts , attempts+1,optLogAttempts);
        }
      }
      else {
        // some other error
        throw errorStack(err);
      }
    }
  }
}

/**
 * get the stack
 * @return {string} the stack trace
 */
function errorStack(e) {
  try {
    // throw a fake error
    throw new Error();  //x is undefined and will fail under use struct- ths will provoke an error so i can get the call stack
  }
  catch(err) {
    return 'Error:' + e + '\n' + err.stack.split('\n').slice(1).join('\n');
  }
}
/**
 * append array b to array a
 * @param {Array.*} a array to be appended to 
 * @param {Array.*} b array to append
 * @return {Array.*} the combined array
 **/
function arrayAppend (a,b) {
  // append b to a
  if (b && b.length)Array.prototype.push.apply(a,b);
  return a;
}

/**
 * escapeQuotes()
 * @param {string} s string to be escaped
 * @return {string} escaped string
 **/
function escapeQuotes( s ) {
  return (s + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

/** get an array of objects from sheetvalues and unflatten them
 * @parameter {Array.object} values a 2 dim array of values return by spreadsheet.getValues()
 * @return {object} an object
 **/
function getObjectsFromValues  (values) {
  var obs = [];
  for (var i=1 ; i < values.length ; i++){
    var k = 0;
    obs.push(values[i].reduce (function (p,c) {
      p[values[0][k++]] = c;
      return p;
    } , {}));
  }
  return obs;
  
}

/* ranking an array of objects
 * @param {Array.object} array the array to be ranked
 * @param {function} funcCompare the comparison function f(a,b)
 * @param {function} funcStoreRank how to store rank f ( object , rank (starting at zero) , arr (the sorted array) )
 * @param {function} funcGetRank how to get rank f ( object)
 * @param {boolean} optOriginalOrder =false retin the original order
 * @return {Array.object} the array, sorted and with rank
 */
function arrayRank (array,funcCompare,funcStoreRank,funcGetRank,optOriginalOrder) {
  
  // default compare/getter/setters
  funcCompare = funcCompare ||   function (a,b) {
        return a.value - b.value;
      };
  funcStoreRank = funcStoreRank || function (d,r,a) {
        d.rank = r; 
        return d;
      };
  funcGetRank = funcGetRank || function (d) {
        return d.rank;
      } ;
      
  var sortable =  optOriginalOrder ? array.map(function (d,i) { d._xlOrder = i; return d; }) : array; 
      
  sortable.sort (function (a,b) {
    return funcCompare (a,b);
  })
  .forEach (function (d,i,arr) {
    funcStoreRank (d, i ? ( funcCompare(d, arr[i-1]) ?  i: funcGetRank (arr[i-1]) ) : i, arr );
  });
  
  if (optOriginalOrder) { 
    sortable.forEach (function (d,i,a) {
      funcStoreRank ( array[d._xlOrder], funcGetRank(d) , a );
    });
  }
  
  return array;
}

/**
 * format catch error
 * @param {Error} err the array to be ranked
 * @return {string} formatted error
 */
function showError (err) {

  try {
    if (isObject(err)) {
      if (e.message) {
        return "Error message returned from Apps Script\n" + "message: " + e.message + "\n" + "fileName: " + e.fileName + "\n" + "line: " + e.lineNumber + "\n";
      }
      else {
        return JSON.stringify(err);
      }
    }
    else {
      return err.toString();
    }
  }
  catch (e) {
    return err;
  }
}

 /**
 * identify the call stack
 * @param {Number} level level of call stack to report at (1 = the caller, 2 the callers caller etc..., 0 .. the whole stack
 * @return {object || array.object} location info - eg {caller:function,line:string,file:string};
 */
function whereAmI(level) {
  
  // by default this is 1 (meaning identify the line number that called this function) 2 would mean call the function 1 higher etc.
  level = typeof level === 'undefined' ? 1 : Math.abs(level);

  
  try {
    // throw a fake error
    throw new Error();  //x is undefined and will fail under use struct- ths will provoke an error so i can get the call stack
  }
  catch (err) {
    // return the error object so we know where we are
    var stack = err.stack.split('\n');
    if (!level) {
      // return an array of the entire stack
      return stack.slice(0,stack.length-1).map (function(d) {
        return deComposeMatch(d);
      });
    }
    else {
    
      // return the requested stack level 
      return deComposeMatch(stack[Math.min(level,stack.length-1)]);
    }

  }
  
  function deComposeMatch (where) {
    
    var file = /at\s(.*):/.exec(where);
    var line =/:(\d*)/.exec(where);
    var caller =/:.*\((.*)\)/.exec(where);
    

    return {caller:caller ? caller[1] :  'unknown' ,line: line ? line[1] : 'unknown',file: file ? file[1] : 'unknown'};

  }
}

/**
 * return an object describing what was passed
 * @param {*} ob the thing to analyze
 * @return {object} object information
 */
function whatAmI (ob) {

  try {
    // test for an object
    if (ob !== Object(ob)) {
        return {
          type:typeof ob,
          value: ob,
          length:typeof ob === 'string' ? ob.length : null 
        } ;
    }
    else {
      try {
        var stringify = JSON.stringify(ob);
      }
      catch (err) {
        var stringify = '{"result":"unable to stringify"}';
      }
      return {
        type:typeof ob ,
        value : stringify,
        name:ob.constructor ? ob.constructor.name : null,
        nargs:ob.constructor ? ob.constructor.arity : null,
        length:Array.isArray(ob) ? ob.length:null
      };       
    }
  }
  catch (err) {
    return {
      type:'unable to figure out what I am'
    } ;
  }
}

/**
 * a little like the jquery.extend() function
 * the first object is extended by the 2nd and subsequent objects - its always deep
 * @param {object} ob to be extended
 * @param {object...} repeated for as many objects as there are
 * @return {object} the first object extended
 */
function extend () {
  
    // we have a variable number of arguments
    if (!arguments.length) {
      // default with no arguments is to return undefined 
      return undefined;
    }
    
    // validate we have all objects
    var extenders = [],targetOb;
    for (var i = 0; i < arguments.length; i++) {
      if(arguments[i]) {
        if (!isObject(arguments[i])) {
          throw 'extend arguments must be objects not ' + arguments[i];
        }
        if (i ===0 ) {
          targetOb = arguments[i];
        } 
        else {
          extenders.push (arguments[i]);
        }
      }
    }
    
    // set defaults from extender objects
    extenders.forEach(function(d) {
        recurse(targetOb, d);
    });
    
    return targetOb;
   
    // run do a deep check
    function recurse(tob,sob) {
      Object.keys(sob).forEach(function (k) {
      
        // if target ob is completely undefined, then copy the whole thing
        if (isUndefined(tob[k])) {
          tob[k] = sob[k];
        }
        
        // if source ob is an object then we need to recurse to find any missing items in the target ob
        else if (isObject(sob[k])) {
          recurse (tob[k] , sob[k]);
        }
        
      });
    }
}

/**
 * @param {string} inThisString string to replace in
 * @param {string} replaceThis substring to be be replaced
 * @param {string} withThis substring to replace it with
 * @return {string} the updated string
 */
function replaceAll(inThisString, replaceThis, withThis) {
  return inThisString.replace (new RegExp(replaceThis,"g"), withThis);
}

/** 
 * make a hex sha1 string
 * @param {string} content some content
 * @return {string} the hex result
 */
function makeSha1Hex (content) {
  return byteToHexString(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, content));
}
/**
 * convert an array of bytes to a hex string
 * @param {Array.byte} bytes the byte array to convert
 * @return {string} the hex encoded string
 */
function byteToHexString (bytes) {
  return bytes.reduce(function (p,c) {
    return p += padLeading ((c < 0 ? c+256 : c).toString(16), 2 );
  },'');
}
/**
 * pad leading part of string
 * @param {string} stringtoPad the source string
 * @param {number} targetLength what the final string length should be
 * @param {string} padWith optional what to pad with - default "0"
 * @return {string} the padded string
 */
function padLeading (stringtoPad , targetLength , padWith) {
  return (stringtoPad.length <  targetLength ? Array(1+targetLength-stringtoPad.length).join(padWith | "0") : "" ) + stringtoPad ;
}
/**
 * get base64 encoded data as a string
 * @param {string} b64 as a string
 * @return {string} decoded as as string
 */
function b64ToString ( b64) {
  return Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString();
}

/**
 * checks that args are what they should be
 * you can convert a functions arguments to an array and call like this
 * you can use the special type any to allow undefined as a valid argument
 * validateArgs (Array.prototype.slice.call(arguments), [... expected types ...]);
 * @param {Array} args the arguments to check
 * @param {Array.string} types what to check them against
 * @param {boolean} optFail whether to throw an error if no match [default=true]
 * @return {object} whether args are okay. - test for .ok.. will throw and error if optFail is true
 */
function validateArgs (funcArgs , funcTypes , optFail) {

  // just clean & clone the args arrays
  var args = Array.isArray(funcArgs) ? funcArgs.slice(0) : (funcArgs ? [funcArgs] : []) ;
  var types = Array.isArray(funcTypes) ? funcTypes.slice(0) : (funcTypes ? [funcTypes] : []);
  var fail = applyDefault(optFail, true);
  
  // we'll allow for any args
  if (args.length < types.length) {
    args = arrayAppend(args, new Array(types.length - args.length));
  }
  
  // should be same length now
  if (args.length !== types.length) {
    throw "validateArgs failed-number of args and number of types must match("+args.length+":"+types.length+")" + JSON.stringify(whereAmI(0));
    
  }
  
  // now we need to check every type of the array
  for (var i=0,c = {ok:true}; i<types.length && c.ok;i++) {
    c = check ( types[i] , args[i], i);
  }
  return c;
  
  // this does the checking
  function check(expect,  item , index) {
    
    var isOb = isObject(item);
    var got = typeof item;
    
    // if its just any old object we can let it go
    if ((isOb && expect === "object") || (got === expect)) {
      return {ok:true};
    }
    
    // for more complicated objects we can check for constructor names
    var cName = (isOb && item.constructor && item.constructor.name) ?  item.constructor.name : "" ;
    
    if (cName === "Array") {
      //what should be expected is Array.type
      if (expect.slice(0,cName.length) !== cName  && expect.slice(0,3) !== "any") {
        return report (expect, got, index, cName);
      }
      
      // this is the type of items in this array
      var match = new RegExp("\\.(\\w*)").exec(expect);
      var arrayType = match && match.length > 1 ? match[1] : "";
      
      // any kind of array will do?
      if (!arrayType) {
        return {ok:true};
      }
      // now we need to check every element of the array
      for (var i=0,c = {ok:true}; i<item.length && c.ok;i++) {
        c = check ( arrayType , item[i] , index,i);
      }
      return c;
      
    }
    
    // these all match
    else if (cName === expect || expect === "any") {
      return {ok:true};
    }
    
    // this is a fail
    else {
      return report (expect, got , index,cName);
    }
    
  }
  
  function report (expect,got,index,name,elem) {
    var state =  {
      ok:false,
      location:whereAmI(0),
      detail: {
        index: index ,
        arrayElement: applyDefault(elem, -1),
        type: types[index],
        expected: expect,
        got: got
      }
    };
    
    Logger.log (JSON.stringify(state));
    if (fail) {
      throw JSON.stringify(state); 
    }
    return state;
  }
}
/**
 * create a column label for sheet address, starting at 1 = A, 27 = AA etc..
 * @param {number} columnNumber the column number
 * @return {string} the address label 
 */
function columnLabelMaker (columnNumber,s) {
  s = String.fromCharCode(((columnNumber-1) % 26) + 'A'.charCodeAt(0)) + ( s || '' );
  return columnNumber > 26 ? columnLabelMaker ( Math.floor( (columnNumber-1) /26 ) , s ) : s;
}
/**
* general function to walk through a branch
* @param {object} parent the head of the branch
* @param {function} nodeFunction what to do with the node
* @param {function} getChildrenFunctiontion how to get the children
* @param {number} depth optional depth of node
* @return {object} the parent for chaining
*/
function traverseTree (parent, nodeFunction, getChildrenFunction, depth) {
  
  depth = depth || 0;
  // if still some to do
  if (parent) {
    
    // do something with the header
    nodeFunction (parent, depth++);
    
    // process the children
    (getChildrenFunction(parent) || []).forEach ( function (d) {
      traverseTree (d , nodeFunction , getChildrenFunction, depth);
    });
    
  }
  return parent;
}
/**
 * takes a function and its arguments, runs it and times it
 * @param {func} the function
 * @param {...} the rest of the arguments
 * @return {object} the timing information and the function results
 */
function timeFunction () {

    var timedResult = {
      start: new Date().getTime(),
      finish: undefined,
      result: undefined,
      elapsed:undefined
    }
    // turn args into a proper array
    var args = Array.prototype.slice.call(arguments);
    
    // the function name will be the first argument
    var func = args.splice(0,1)[0];
    
    // the rest are the arguments to fn - execute it
    timedResult.result = func.apply(func, args); 
    
    // record finish time
    timedResult.finish = new Date().getTime();
    timedResult.elapsed = timedResult.finish - timedResult.start;
    
    return timedResult;
}

/**
* remove padding from base 64 as per JWT spec
* @param {string} b64 the encoded string
* @return {string} padding removed
*/
function unPadB64 (b64) {
  return b64 ?  b64.split ("=")[0] : b64;
}

/**
* b64 and unpad an item suitable for jwt consumptions
* @param {string} itemString the item to be encoded
* @return {string}  the encoded
*/
function encodeB64 (itemString) {
  return unPadB64 (Utilities.base64EncodeWebSafe( itemString));
}