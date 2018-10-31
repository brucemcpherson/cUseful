/**
 * a general purpose fetcher 
 * supports caching (including oversize and zipping) and paging
 */ 
var Fetcheroo = function () {
  const self = this;
  const utils = Utils;
  const expb = utils.expBackoff;
  const keyDigest = utils.keyDigest;
 
  
  var tokenService = function () {};
  
  // default settings
  // default settings are for a google style api
  self.settings =  {
    request: {
      protocol: 'https:',
      hostName: 'api.example.com',
      path: "",
      port: 443,
      method: 'GET',
      version:'',
      query: {},
      contentType:'application/json',
      headers: {
        Accept: 'application/json'
      }
    },
    fetcheroo: {
      enableCaching: true,
      pathRequired: true,
      tokenRequired: false,
      cacheCrusher:null,
      defaultPageSize: 50,
      logUrl: false,
      cleanData: function (result) {
        return result;
      },
      setNextPageToken: function (result,query) {
        if (result.data && result.data.nextPageToken) {
          query.pageToken =  result.data.nextPageToken;
        }
        else if (query.hasOwnProperty("pageToken")) {
          delete query.pageToken;
        }
        return query.pageToken;
      },
      setPageSize : function (allData , request , query ) {
        if (typeof request !== "object") throw "setpagesize request must be an object";
        if (typeof query !== "object") throw "setpagesize query must be an object";
        if (!Array.isArray(allData)) throw "allData query must be an array";
        var ds =  self.settings.fetcheroo.defaultPageSize;
        if (request.limit) {
          if (allData.length <= request.limit) {
            query.pageSize = Math.min (ds , request.limit - allData.length);
          }
          else {
            throw 'attempt to retrieve more than the limit of '+ request.limit + ' already did ' + allData.length;
          }
          return query.pageSize;
        }
        else if (!utils.isUndefined(request.limit) ){
          query.pageSize = ds;
          return ds;
        }
        else {
          return undefined;
        }

      },
      cacheSeconds: 60 * 60 * 4    // 4 hours
    }
  };

    
  self.enableCaching = function (enable) {
    self.settings.fetcheroo.enableCaching = enable;
    return self;
  };  
  
  /**
   * init takes settings updates
   * @param {function}  this will be url fetch app probably 
   * @param {object} options to merge with default fetch options
   * @param {object} settings to merge with default settings
   * @return self
   */
  self.init = function (fetchApp, options,settings) {
    self.fetchApp = fetchApp;
    self.settings = utils.vanExtend ( self.settings , {
      request: options || {},
      fetcheroo: settings || {}
    });

    self.cc =  self.settings.fetcheroo.cacheCrusher;
    return self;
  };
  
  /** 
  * set access token
  * @param {function} accessTokenService token
  * @return self
  */
  self.setTokenService = function (accessTokenService) {
    tokenService = accessTokenService;
    return self;
  };

  /**
  * convert urlfetch response into result
  * .error will contain the text if there weas one
  * .data the parsed result
  *. code the response code
  */
  self.makeResult = function (result) {
    const rob = {};
    
    const text = result.getContentText();
    rob.code = result.getResponseCode();

    // standard good/bad errors
    if (rob.code < 200 || rob.code >= 300) {
      rob.error = text;
    }
    
    // assume we'll always get JSON
    else {
      try {
        rob.data = JSON.parse(text);
      }
      //that didnt work, so get the blob.
      catch (err) {
        rob.blob =  result.getBlob();
      }
    }
    
    return rob;
  };
  
  /**
   * these are just shortcuts for basic requests
   */
  self.get = function (path) {
    return self.request (path , {method:"GET"} );
  };
  
  self.post = function (body, path) {
    return self.request (path , {method:"POST"} , null ,body );
  };
  
  /**
  * construct a request 
  *@param {string} path the specific path to be appended to the host
  *@param {object} options any additional options for the request
  *@param {object} query and parameteres to construct for the url
  *@param {object} body the post body
  *@param {function} cleandata a function to disentangle the api response if required
  *@param {number} limit max to get
  *@return {object} a result {error:,code:,data:[]}
  */
  self.request = function (request) {

    request = request || {};
                            
    // short cuts
    const fs = self.settings.fetcheroo;
    const dft = self.settings.request;
    const token = fs.tokenRequired && tokenService();
    if (fs.tokenRequired && !token) throw 'token required - use set token';
    
    // add options
    var options = utils.vanExtend ({
      method: dft.method,
      headers: dft.headers,
      muteHttpExceptions: true
    }, request.options);
                            
    // normalize                     
    options.method = options.method.toUpperCase();
    if (token)options.headers.Authorization = "Bearer " + token;
    
    // always need a path?
    var path = request.path || dft.path;
    if (fs.pathRequired && !path) throw 'path required';
    if (path && path.charAt(0) !== '/') path = '/' + path;

    // sort out the payload
    if (['POST', 'PATCH', 'PUT', 'DELETE'].indexOf(options.method) !== -1) {
      if (dft.contentType) options.contentType = dft.contentType;
      
      // if there's a body
      var body  = request.body;
      if (!utils.isUndefined(body) && dft.contentType === "application/json") {
        options.payload = JSON.stringify (body);
      }
      else {
        options.payload = body;
      }
    }
    // do the request and page it if required
    const url = dft.protocol + "//" + dft.hostName+ ":" + dft.port + dft.version;
    
    return self.paging ( {
      url: url,
      startPath: path,
      options: options, 
      query: request.query,
      cleanData: request.cleanData,
      limit: request.limit,
      setPageSize: request.setPageSize
    });

  };
  
  
  /**
   * do a fetch and deal with paging
   * @param {object} request 
   * @return a result
   */
  self.paging = function (request) {
    
    // short cuts
    const fs = self.settings.fetcheroo;
    const fo = self.settings.request;
    
    // pile up results here
    var allData = [];
    var allErrors = [];
    
    // deconstruct params
    var url = request.url;
    var startPath = request.startPath;
    var options = request.options; 
    var query = utils.clone (request.query);
    var cleanData = request.cleanData || fs.cleanData ;
    var setPageSize = request.setPageSize || fs.setPageSize;
    var limit = request.limit ;
    
    // get a digest for caching GET and see if its in cache
    const digest = options.method === "GET" && self.cc  ? keyDigest (url , startPath , options, query , limit + "") : "";
    var cached = digest && fs.enableCaching && self.cc.get (digest);
    if (digest && !fs.enableCaching) {
      // delete previous as it'll potentially be stale compared to this fetch
      self.cc.remove (digest);
    }

    // paging request final result
    var final={data:[], code:200, wasCached:cached ? true : false};
    
    // if it wasn't in cache
    if (!cached) {
      
     
      // loop and do paging
      do {
        // add any url params
        var more = false;
        var pageSize = setPageSize (allData , request , query);
        if (pageSize || utils.isUndefined (pageSize)) {
          var path = utils.addQueryToPath (query , startPath);
          if (fs.logUrl) {
            Logger.log (path);
          }
          // do the fetch
          var result = expb (function () {
            return self.makeResult(self.fetchApp.fetch(url + path, options));
          });
          
          if (result.error) {
            // TODO do something about the headers for error 429
            allErrors.push ({ code: result.code ,error:result.error});
          }
          else {
            
            // paging if necessary
            var more = fs.setNextPageToken(result , query ) ;
            
            // clean up the data for this kind of result
            result = cleanData (result);
            
            // clean data is supposed to maintain an array of results in result.data
            if (result.data) {
              if (!Array.isArray (result.data)) throw 'cleandata should have created an array of results in result.data';
              // append to final result
              utils.arrayAppend (allData , result.data );
            }
          }
        }
        // while still getting data 
      } while ( more ) ;
      
      // all data to cache
      if (!allErrors.length) { 
        if (digest && fs.enableCaching) {
            self.cc.put ( digest , allData , self.settings.fetcheroo.cacheSeconds );
        }
        final.data = allData;
      }
      else {
        // what will we do when there's been an error ?
        // probably best to scratch all the results, and take the first error code
        final.code = allErrors[0].code;
        final.error = allErrors.map (function (d) { return d.error;}).join (",");
      }
    }
    else {
      // we have it in cache already
      final.data = cached;

    }
    return final;
  };
};


