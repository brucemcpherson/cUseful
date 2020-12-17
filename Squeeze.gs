/**
* utils for squeezing more out of Apps Script quotas
* @namespace Squeeze
*/
var Squeeze = (function (ns) {
  
  /**
  * utilities for zipping and chunking data for property stores and cache
  * @constructor ChunkingUtils
  */
  ns.Chunking = function () {
    
    // the default maximum chunksize
    var chunkSize_ = 9*1024, 
      self = this, 
      store_, 
      prefix_ = "chunking_", 
      overhead_ = 12, 
      digestOverhead_ = 40 + 10,
      respectDigest_ = true,
      compressMin_ = 300;
    

    
    //--default functions for these operations
    
    // how to get an object
    var getObject_ = function (store , key) {
      var result = readFromStore_ (store, key );
      return result ? JSON.parse (result) : null;
    };
    
    // how to set an object
    var setObject_ = function (store,  key , ob , expire) {
      var s = JSON.stringify(ob || {});
      writeToStore_ ( store , key, s , expire );
      return s.length;
    };
    
    // how to write a string
    var writeToStore_ = function ( store, key, str) {
      return Utils.expBackoff(function () { 
        return store.setProperty (key , str); 
      });
    };
    
    // how to read a string
    var readFromStore_ = function (store, key) {
      return Utils.expBackoff(function () { 
        return store.getProperty (key); 
      });
    };
    
    // how to remove an object
    var removeObject_ = function (store, key) {
      return Utils.expBackoff(function () { 
        return store.deleteProperty (key);
      });
    };
    
    /**
    * set the max chunksize
    * @param {number} chunkSize the max size
    * @return {Chunking} self
    */
    self.setChunkSize = function (chunkSize) {
      chunkSize_ = chunkSize;
      return self;
    };
    
    /**
    * minimum size over which to compress
    * @return {boolean} respectDigest the max size
    */
    self.getCompressMin = function () {
      return compressMin_;
    };
    
    /**
    * whether to respect digest to avoid rewriting unchanged records
    * @param {boolean} compressMin the min size
    * @return {Chunking} self
    */
    self.setCompressMin = function (compressMin) {
      if (!Utils.isUndefined(compressMin))compressMin_ = compressMin;
      return self;
    };
    
    /**
    * whether to respect digest to avoid rewriting unchanged records
    * @return {boolean} respectDigest 
    */
    self.getRespectDigest = function () {
      return respectDigest_;
    };
    
    /**
    * whether to respect digest to avoid rewriting unchanged records
    * @param {boolean} respectDigest the max size
    * @return {Chunking} self
    */
    self.setRespectDigest = function (respectDigest) {
      if (!Utils.isUndefined(respectDigest_))respectDigest_ = respectDigest;
      return self;
    };
    
    /**
    * get the max chunksize
    * @return {number} chunkSize the max size
    */
    self.getChunkSize = function () {
      return chunkSize_;
    };
    
    /**
    * set the key prefix
    * @param {string} prefix the key prefix
    * @return {Chunking} self
    */
    self.setPrefix = function (prefix) {
      if (!Utils.isUndefined(prefix))prefix_ = prefix.toString() ;
      return self;
    };
    
    /**
    * get the prefix
    * @return {string} prefix the prefix
    */
    self.getPrefix = function () {
      return prefix_;
    };
    /**
    * set the store
    * @param {object} store the store
    * @return {Chunking} self
    */
    self.setStore = function (store) {
      store_ = store;
      return self;
    };
    
    /**
    * get the store
    * @return {object} the store
    */
    self.getStore = function () {
      return store_;
    };
    
    /**
    * set how to get an object
    * @param {function} func how to get an object
    * @return {Chunking} self
    */
    self.funcGetObject = function (func) {
      // func should take a store, key and return an object
      getObject_ = checkAFunc(func);
      return self;
    };
    
    /**
    * set how to get an object
    * @param {function} func how to set an object
    * @return {Chunking} self
    */
    self.funcSetObject = function (func) {
      // func should take a store, key and an object, and return the size of the stringified object
      setObject_ = checkAFunc(func);
      return self;
    };
    
   /**
    * set how to read from store
    * @param {function} func how to read from store 
    * @return {Chunking} self
    */
    self.funcReadFromStore = function (func) {
      // func should take a store key, and return a string
      readFromStore_ = checkAFunc(func);
      return self;
    };
    
   /**
    * set how to write to store
    * @param {function} func how to set an object
    * @return {Chunking} self
    */
    self.funcWriteToStore = function (func) {
      // func should take a store key and a string to write
      writeToStore_ = checkAFunc(func);
      return self;
    };
    
    /**
    * set how to remove an object
    * @param {function} func how to remove an object
    * @return {Chunking} self
    */
    self.funcRemoveObject = function (func) {
      // func should take a store, key
      removeObject_ = checkAFunc(func);
      return self;
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
    
    function payloadSize_ () {
      if (chunkSize_ <= overhead_) {
        throw 'chunksize must be at least '+ ( overhead_ +1);
      }
      return chunkSize_ - overhead_;
    }
    
    function digest_ (what) {
      return Utils.keyDigest (what);
    }
    
    function uid_ () {
      return Utils.generateUniqueString();
    }
    
    function getChunkKey_ (key) {
      return key + "_" + uid_ ();
    }
    
    function fudgeKey_ (key) {
      if (Utils.isUndefined(key) || key === null)throw 'property key must have a value';
      return typeof key === "object" ? digest_ (key) : key;
      
    }

    /** 
    * get the keys of multiple entries if it was too big
    * @param {PropertiesService} props the service to use
    * @param {object} propKey the key
    * @return {object} the result {chunks:[],data:{}} - an array of keys, or some actual data
    */
    self.getChunkKeys = function (propKey) {
      
      // in case the key is an object
      propKey = fudgeKey_(propKey);
      
      var data , 
          crushed = getObject_ (self.getStore(), propKey);

      // at this point, crushed is an object with either
      // a .chunk property with a zipped version of the data, or
      // a .chunks property with an array of other entries to get
      // a .digest property with the digest of all the data which identifies it as a master
      
      // its a non split item
      if (crushed && crushed.chunk && crushed.digest) {
        // uncrush the data and parse it back to an object if there are no associated records
        data = crushed.chunk ? JSON.parse ( crushed.skipZip ? crushed.chunk : self.unzip(crushed.chunk)) : null;
       
      }
      
      // return either the data or where to find the data
      return {
        chunks: crushed && crushed.chunks ? crushed.chunks: null,
        data: data,
        digest:crushed ? crushed.digest : "",
        skipZip: crushed && crushed.skipZip
      }
      
    };
    
    /** 
    * remove an entry and its associated stuff
    * @param {object} propKey the key
    * @return {Props} self
    */
    self.removeBigProperty = function (propKey) {
      
      // in case the key is an object
      propKey = fudgeKey_(propKey);
      var removed = 0;
      
      // always big properties are always crushed
      var chunky = self.getChunkKeys (prefix_ + propKey);

      // now remove the properties entries
      if (chunky && chunky.chunks) {
        chunky.chunks.forEach(function (d) {
          removeObject_ (self.getStore(), d);
          removed++;
        });
      }
      // now remove the master property
      if (chunky.digest) {
        removeObject_ (self.getStore() , prefix_ + propKey);
        removed++;
      }
      
      return removed;
      
    };
    
   
    
    /** 
    * updates a property using multiple entries if its going to be too big
    * @param {object} propKey the key
    * @param {object} ob the thing to write
    * @param {number} expire secs to expire
    * @return {size} of data written - if nothing done, size is 0
    */
    self.setBigProperty  = function (propKey,ob,expire) {
      
      // in case the key is an object
      propKey = fudgeKey_(propKey);
      
      // donbt allow undefined
      if (Utils.isUndefined (ob) ) {
        throw 'cant write undefined to store';
      }
     
      // blob pulls it out
      if (Utils.isBlob (ob) ) {
        var slob = {
          contentType:ob.getContentType(),
          name:ob.getName(),
          content:Utilities.base64Encode(ob.getBytes()),
          blob:true
        }
      }
      
      // convery to timestamp
      else if ( isDateObject (ob)) {
        var slob = {
          date: true,
          content: ob.getTime()
        }
      }
      
      // strinfigy
      else if (typeof (ob) === "object") {
        var slob = {
          content:JSON.stringify(ob),
          parse: true
        }
      }
      
      else {
        var slob = {
          content: ob
        }
      }
      
      // pack all that up to write to the store
      const sob = JSON.stringify (slob);
      
      // get the digest
      var digest = Utils.keyDigest (sob);
      
      // now get the master if there is one
      var master = getObject_ (self.getStore(), prefix_ + propKey);
      
      if (master && master.digest && master.digest === digest && respectDigest_ && !expire) {
        // nothing to do
        return 0;
      }
      else {
        // need to remove the previous entries and add this new one
        self.removeBigProperty (propKey);
        return setBigProperty_ (prefix_ + propKey,sob, expire);
      }
      
    };
    
    /** 
    * gets a property using multiple entries if its going to be too big
    * @param {object} propKey the key
    * @return {object} what was retrieved
    */
    self.getBigProperty = function (propKey) {
      
      // in case the key is an object
      propKey = fudgeKey_(propKey);
      
      // always big properties are always crushed
      var chunky = self.getChunkKeys ( prefix_ + propKey);
      
      // that'll return either some data, or a list of keys
      if (chunky && chunky.chunks) {
        var p = chunky.chunks.reduce (function (p,c) {
          var r = getObject_ ( self.getStore() , c);
          
          // should always be available
          if (!r) {
            throw 'missing chunked property ' + c + ' for key ' + propKey;
          }
          
          // rebuild the crushed string
          return p + r.chunk;
        },"");
        
        // now uncrush the result
        var package = JSON.parse(chunky.skipZip ? p : self.unzip (p));
      }
      else {
        // it was just some data
        var package =  chunky ? chunky.data : null;
      }

      // now need to unpack;
      if (package) {
        if (package.parse) {
          return JSON.parse (package.content);
        }
        else if(package.date) {
          return new Date (package.content);
        }
        else if (package.blob) {
          return Utilities.newBlob(Utilities.base64Decode(package.content), package.contentType, package.name);
        }
        else {
          return package.content;
        }
      }
      else {
        return null;
      }
    };
    
    /** 
    * sets a property using multiple entries if its going to be too big
    *  use self.setBigProperty() from outside, which first deletes existing stuff 
    *  as well as checking the digest
    * @param {object} propKey the key
    * @param {string} sob the thing to write
    * @return {number} total length of everything written
    */
    function setBigProperty_ (propKey,sob, expire) {

      // always crush big properties
      var size=0;
      
      // crush the object
      var skipZip = sob.length < compressMin_;
      var chunks, crushed = skipZip ?  sob : self.zip (sob) ;

      // get the digest 
      // the digest is used to avoid updates when theres no change
      var digest = digest_ (sob);
      
      // if we have an overflow, then need to write multiple properties
      if (crushed.length > payloadSize_() - digestOverhead_) {
        chunks = [];
      }
      
      // now split up the big thing if needed
      // expire should be a little bigger for the chunks to make sure they dont go away
      
      do {
        
        // peel off a piece
        var chunk = crushed.slice(0,payloadSize_());
        crushed = crushed.slice (chunk.length);
        
        if (chunks) {
          
          // make a new entry for the key
          var key = getChunkKey_ (propKey);
          size += setObject_ (self.getStore(), key , {
            chunk:chunk
          },expire ? expire + 1: expire);
          
          // remember the key
          chunks.push (key);
          
        }
        else {
          size += setObject_ (self.getStore(), propKey , {
            chunk:chunk,
            digest:digest,
            skipZip:skipZip
          },expire);
        }
        
      } while (crushed.length);
      
      // now write the index if there were chunks
      if (chunks) {
        size += setObject_ (self.getStore(), propKey,{
          chunks:chunks,
          digest:digest,
          skipZip: skipZip
        },expire );
      }
      
      return size;
    };
    
    /**
    * crush for writing to cache.props
    * @param {string} crushThis the string to crush
    * @return {string} the b64 zipped version
    */
    self.zip = function (crushThis) {
      return Utilities.base64Encode(Utilities.zip ([Utilities.newBlob(crushThis)]).getBytes());
    };
    
    /**
    * uncrush for writing to cache.props
    * @param {string} crushed the crushed string
    * @return {string} the uncrushed string
    */
    self.unzip = function (crushed) {
      return Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(crushed),'application/zip'))[0].getDataAsString();
    };

  }
  return ns;
})(Squeeze || {});