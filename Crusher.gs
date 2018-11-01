// because this is in the cUseful library, setting cUseful ns to here
// if you are writing plugins outside of cUseful, remove this line
var cUseful = this;
// plugins for Squeeze service 
function CrusherPluginCacheService () {

  // writing a plugin for the Squeeze service is pretty straighforward. 
  // you need to provide an init function which sets up how to init/write/read/remove objects from the store
  // this example is for the Apps Script cache service
  const self = this;
  
  // these will be specific to your plugin
  var settings_;
  
  // standard function to check store is present and of the correct type
  function checkStore () {
     if (!settings_.store) throw "You must provide a cache service to use";
     if (!settings_.chunkSize) throw "You must provide the maximum chunksize supported";
     return self;
  }
  
  // start plugin by passing settings yiou'll need for operations
  /**
   * @param {object} settings these will vary according to the type of store
   */
  self.init = function (settings) {
    settings_ = settings || {};
    
    // set default chunkzise for cacheservice
    settings_.chunkSize = settings_.chunkSize || 100000;
    
    // respect digest can reduce the number of chunks read, but may return stale
    settings_.respectDigest = cUseful.Utils.isUndefined (settings_.respectDigest) ? false : settings_.respectDigest;
    
    // must have a cache service and a chunksize
    checkStore();

    // now initialize the squeezer
    self.squeezer = new cUseful.Squeeze.Chunking ()
      .setStore (settings_.store)
      .setChunkSize(settings_.chunkSize)   
      .funcWriteToStore(write)
      .funcReadFromStore(read)
      .funcRemoveObject(remove)
      .setRespectDigest (settings_.respectDigest)
      .setCompressMin (settings_.compressMin)
      .setPrefix (settings_.prefix);
    
    // export the verbs
    self.put = self.squeezer.setBigProperty;
    self.get = self.squeezer.getBigProperty;
    self.remove = self.squeezer.removeBigProperty;
    return self;
  };

  // return your own settings
  function getSettings () {
    return settings_;
  }
  
  /**
   * remove an item
   * @param {string} key the key to remove
   * @return {object} whatever you  like
   */
  function remove (store, key) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return store.remove (key); 
    });
  }
  
  /**
   * write an item
   * @param {object} store whatever you initialized store with
   * @param {string} key the key to write
   * @param {string} str the string to write
   * @param {number} expiry time in secs
   * @return {object} whatever you like
   */
  function write (store,key,str,expiry) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return expiry ? store.put (key , str ,expiry ) : store.put (key,str); 
    });
    
  }
  
  /**
   * read an item
   * @param {object} store whatever you initialized store with   
   * @param {string} key the key to write
   * @return {object} whatever you like
   */
  function read (store,key) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return store.get (key); 
    });
  }
  


}

function CrusherPluginPropertyService () {

  // writing a plugin for the Squeeze service is pretty straighforward. 
  // you need to provide an init function which sets up how to init/write/read/remove objects from the store
  // this example is for the Apps Script cache service
  const self = this;
  
  // these will be specific to your plugin
  var settings_;
  
  // standard function to check store is present and of the correct type
  function checkStore () {
     if (!settings_.store) throw "You must provide a cache service to use";
     if (!settings_.chunkSize) throw "You must provide the maximum chunksize supported";
     return self;
  }
  
  // start plugin by passing settings yiou'll need for operations
  /**
   * @param {object} settings these will vary according to the type of store
   */
  self.init = function (settings) {
    settings_ = settings || {};
    
    // set default chunkzise for cacheservice
    settings_.chunkSize = settings_.chunkSize || 9000;
    
    // respect digest can reduce the number of chunks read, but may return stale
    settings_.respectDigest = cUseful.Utils.isUndefined (settings_.respectDigest) ? false : settings_.respectDigest;
    
    // must have a cache service and a chunksize
    checkStore();

    // now initialize the squeezer
    self.squeezer = new cUseful.Squeeze.Chunking ()
      .setStore (settings_.store)
      .setChunkSize(settings_.chunkSize)   
      .funcWriteToStore(write)
      .funcReadFromStore(read)
      .funcRemoveObject(remove)
      .setRespectDigest (settings_.respectDigest)
      .setCompressMin (settings_.compressMin);
    
    // export the verbs
    self.put = self.squeezer.setBigProperty;
    self.get = self.squeezer.getBigProperty;
    self.remove = self.squeezer.removeBigProperty;
    return self;
  };

  // return your own settings
  function getSettings () {
    return settings_;
  }
  
  /**
   * remove an item
   * @param {string} key the key to remove
   * @return {object} whatever you  like
   */
  function remove (store, key) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return store.deleteProperty (key); 
    });
  }
  
  /**
   * write an item
   * @param {object} store whatever you initialized store with
   * @param {string} key the key to write
   * @param {string} str the string to write
   * @return {object} whatever you like
   */
  function write (store,key,str) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return store.setProperty (key , str  ); 
    });
    
  }
  
  /**
   * read an item
   * @param {object} store whatever you initialized store with   
   * @param {string} key the key to write
   * @return {object} whatever you like
   */
  function read (store,key) {
    checkStore();
    return cUseful.Utils.expBackoff(function () { 
      return store.getProperty (key); 
    });
  }
  


}

