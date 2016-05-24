/**
* Utils contains useful functions for working with drive
* you must provide run DriveUtils.setService(yourdriveapp) before using
* @namespace
*/
var DriveUtils = (function (ns) {
  
  
  var ENUMS =  { 
    MIMES: {
      SOURCE:"application/vnd.google-apps.script+json",
      SCRIPT:"application/vnd.google-apps.script",
      FOLDER:"application/vnd.google-apps.folder",
      AUDIO:"application/vnd.google-apps.audio",
      DOCUMENT:"application/vnd.google-apps.document",
      DRAWING:"application/vnd.google-apps.drawing",
      FILE:"application/vnd.google-apps.file",
      FORM:"application/vnd.google-apps.form",
      PHOTO:"application/vnd.google-apps.photo",
      PRESENTATION:"application/vnd.google-apps.presentation",
      SITES:"application/vnd.google-apps.sites",
      FUSIONTABLE:"application/vnd.google-apps.fusiontable",
      SPREADSHEET:"application/vnd.google-apps.spreadsheet",
      UNKNOWN:"application/vnd.google-apps.unknown",
      VIDEO:"application/vnd.google-apps.video"
    }
  };
  
  
  // for handling advanced services
  ns.ads = (function (ads) {
    
    /**
    * get files by name
    * @param {string} parentId the parentId
    * @param {string} name the name
    * @param {string} optMime the mime type
    * @param {string} optFields the fields to return
    */
    ads.getFilesByName = function (parentId, name , optMime, optFields) {
      return ads.getChildItems (parentId, optMime , optFields || "items/id" , "title='" + name + "'" + " and mimeType!='" + ENUMS.MIMES.FOLDER + "'" );
    }; 
    
    ads.getFoldersByName = function (parentId, name , optFields) {
      return ads.getChildFolders (parentId, optFields || "items/id" , "title='" + name + "'");
    }; 
    
    ads.getChildFiles = function (parentId, optMime, optFields , optExtraQueries) {
      return ads.getChildItems (parentId, optMime , optFields || "items/id" , "mimeType!='" + ENUMS.MIMES.FOLDER + "'" );
    }; 
    
    /**
    * get child folders
    * @param {string} parentId the id of the parent
    * @param {string} optFields the fields to return
    * @param {Array.string} optExtraQueries
    */
    ads.getChildFolders = function (parentId,  optFields, optExtraQueries) {
      return ads.getChildItems(parentId , ENUMS.MIMES.FOLDER , optFields || "items/id", optExtraQueries) ;
    }; 
    /**
    * get child items
    * @param {string} parentId the id of the parent
    * @param {ENUM.MIMES} optMime the mime type
    * @param {string} optFields the fields to return
    * @param {Array.string} optExtraQueries
    */
    ads.getChildItems = function (parentId,mime,optFields,optExtraQueries) {
      
      // add the folder filter
      var q= mime ? ["mimeType='" + mime + "'"] : [];
      
      // dont include anything deleted
      q.push("trashed=false");
      
      //plus any extra queries
      if(optExtraQueries) {
        var e = Array.isArray(optExtraQueries) ? optExtraQueries : [optExtraQueries];
        Array.prototype.push.apply (q,e);
      } 
      
      var options= {};
      if (optFields) {
        options.fields = optFields;
      }
      if(options.fields && options.fields.indexOf("nextPageToken") === -1) options.fields = (options.fields ? options.fields + "," : "") + "nextPageToken";
      
      options.q = q.join(" and ");  
      
      var items =[] , pageToken;

      do {
        
        var result = Utils.expBackoff(function() {
          return ns.service.Children.list(parentId,options);
        },{ logAttempts:false});

        
        pageToken = result.nextPageToken;
        Array.prototype.push.apply(items , result.items);
        options.pageToken = pageToken;
        
        
      } while (pageToken);
      
      return items;
      
    };
      
    /**
    * return a folder id from a path like /abc/def/ghi
    * @param {string} path the path
    * @return {object} {id:'xxxx'} or null
    */
    ads.getFolderFromPath = function (path)  {
      
      return (path || "/").split("/").reduce ( function(prev,current) {
        if (prev && current) {
          // this gets the folder with the name of the current fragment
          var fldrs = ads.getFoldersByName(prev.id,current);
          return fldrs.length ? fldrs[0] : null;
        }
        else { 
          return current ? null : prev; 
        }
      },ns.rootFolder); 
    };
    return ads;
  })({});
  
  /**
  * to keep this namespace dependency free
  * this must be run to set the driveappservice before it can be used
  * @param {driveapp} dap the driveapp
  * @return {DriveUtils} self
  */
  ns.setService = function (dap) {
    ns.service = dap;
    if (ns.isDriveApp()) {
      ns.rootFolder = Utils.expBackoff ( function () {
        return ns.service.getRootFolder();
      });
      ns.rootFolderId = ns.rootFolder.getId();
    }
    else {
      ns.rootFolder = ns.getFolderById ('root');
      ns.rootFolderId = ns.rootFolder.id;
    }
    return ns;
  };
  
  /**
  * whether we are using driveapp
  * @return {bool} whether we are using driveapp
  */
  ns.isDriveApp = function () {
    ns.checkService();
    return typeof ns.service.continueFolderIterator === 'function';
  };
  
  ns.checkService = function () {
    if(!ns.service) {
      throw 'please do a DriveUtils.setService (yourdriveapp) to inialie namespace';
    }
  };
  
  ns.getFolders = function (parent) {
    if (ns.isDriveApp()) {
      return parent.getFolders();
    }
    else {
      return ns.ads.getChildFolders (parent.id);
    }
  };
  
  ns.getFiles = function (parent,mime) {
    
    if (ns.isDriveApp()) {
    
      return mime ? getFilesByType (mime) : parent.getFiles();
    }
    else {

      return ns.ads.getChildFiles (parent.id, mime);
    }
  };
  
  ns.getFolderById = function (path) {
    
    try {
      return Utils.expBackoff ( function () {
        if (!ns.isDriveApp()) {
          return ns.service.Files.get(path,{fields:"id,title"});  
        }
        else {
          return ns.service.getFolderById (path);
        }
      },{logAttempts:false});
    }
    catch (err) {
      return null;
    }
  }
  /**
  * get all the files as an array from a folder path
  * @param {string} path the path to the start folder
  * @param {string} [mime] the mime type
  * @param {boolean} [recurse=false] whether to recurse
  * @return {[files]} an array of files
  */
  ns.getPileOfFiles = function ( path , mime , recurse ) {
    
    var pile, startFolder;
    
    // first check if the path is an id or a path
    startFolder = ns.getFolderById (path) || ns.getFolderFromPath (path) ;
    
    if (!startFolder) {
      throw 'folder path/id ' + path + ' not found';
    }

    // if opened successfully, then get all the files 
    if (startFolder) {
      pile = (recurse ? recurseFolders ( startFolder,mime ) : pileFiles (startFolder,mime));
    }
    return pile;
    
    /**
    * get all the files in this and child folders
    * @param {folder} folder where to start
    * @param {string} [mime] the mime type
    * @param {[files]} [pile] the growing pike of files
    * @return {[files]}  the growing pike of files
    */
    function recurseFolders (folder, mime, pile) {
      
      
      // get the folders from the next level
      var it = ns.getFolders(folder);
      if (ns.isDriveApp () ) {
        while (it.hasNext()) {
          pile = recurseFolders (it.next() , mime , pile);
        }
      }
      else {
        it.forEach(function(d) {
          pile = recurseFolders (d , mime , pile)
        });
      }
      
      // collect from this folder
      return pileFiles(folder, mime, pile);
      
    }
    
    /**
    * get all the files in this folder
    * @param {folder} folder where to start
    * @param {string} [mime] the mime type
    * @param {[files]} [pile] the growing pike of files
    * @return {[files]}  the growing pike of files
    */    
    function pileFiles (folder, mime , pile) {
      
      var pile = pile || [];
      Array.prototype.push.apply (pile, getFiles(folder,mime));
      return pile;
    }
    
    /**
    * get all the files in a gven folder
    * @param {folder} folder where to start
    * @param {string} [mime] the mime type
    * @return {[files]}  the files
    */
    function getFiles (folder,mime) {
      var files= [];
      var it = ns.getFiles (folder , mime) ;
      
      if (ns.isDriveApp()) {

        folderPath = ns.getPathFromFolder (folder);
        
        while (it.hasNext()) {
          var file = it.next();
          files.push({
            file:file,
            folder:folder,
            path:folderPath  + file.getName()
          });
        }
      }
      else {

        it.forEach(function(d) {
          files.push({
            file:d,
            folder:folder
          });
        })
      }
      return files;
    }
    
    
  };
  /**
  * get the files from a path like /abc/def/hgh/filename
  * @param {string} path the path
  * @return {FileIterator} a fileiterator
  */
  ns.getFilesFromPath = function (path) {
    
    // get the filename and the path seperately
    var s = path.split("/");
    if (!s.length) { 
      return null;
    }
    var filename = s[s.length-1];
    
    // the folder
    var folder = ns.getFolderFromPath (
      "/" + (s.length > 1 ? s.slice(0,s.length-1).join("/") : "")
    );
    
    if (ns.isDriveApp() ) {
      return Utils.expBackoff ( function () {
        return folder.getFilesByName (filename);
      });
    }
    else {
      return ns.ads.getFilesByName (folder.id , filename);
    }
    
  };
  
  
  /**
  * get a folder from a path like /abc/def/hgh
  * @param {string} path the path
  * @return {Folder} a folder
  */
  ns.getFolderFromPath = function (path) {
    
    // the drivapp way
    if (ns.isDriveApp()) {
      return (path || "/").split("/").reduce ( 
        function(prev,current) {
          if (prev && current) {
            var fldrs = Utils.expBackoff ( function () {
              return prev.getFoldersByName(current);
            });
            return fldrs.hasNext() ? fldrs.next() : null;
          }
          else { 
            return current ? null : prev; 
          }
        },ns.rootFolder); 
    }
    
    
    // the advanced service way
    else {
      return ns.ads.getFolderFromPath (path);
    }
    
  };
  
  /**
  * get a path like /abc/def/hgh from a folder
  * @param {Folder} folder the folder
  * @return {string} a path
  */
  ns.getPathFromFolder = function ( folder ,optPath) {
    
    ns.checkService();
    if (!folder) return '';
    var path = optPath || '/';
    
    // we're done if we hit the root folder
    return folder.getId() === ns.rootFolderId ? path : ns.getPathFromFolder (
      folder.getParents().next() , '/' + folder.getName() + path
    );
    
  };
  
  
  return ns;
}) (DriveUtils || {});


