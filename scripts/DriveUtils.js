/**
* Utils contains useful functions for working with drive
* you must provide run DriveUtils.setService(yourdriveapp) before using
* @namespace
*/
var DriveUtils = (function (ns) {
  
  /**
   * to keep this namespace dependency free
   * this must be run to set the driveappservice before it can be used
   * @param {driveapp} dap the driveapp
   * @return {DriveUtils} self
   */
  ns.setService = function (dap) {
    ns.service = dap;
    ns.rootFolder = Utils.expBackoff ( function () {
      return ns.service.getRootFolder();
    });
    ns.rootFolderId = ns.rootFolder.getId();
    return ns;
  };
  
  ns.checkService = function () {
    if(!ns.service) {
      throw 'please do a DriveUtils.setService (yourdriveapp) to inialie namespace';
    }
  };
  /**
   * get all the files as an array from a folder path
   * @param {string} path the path to the start folder
   * @param {string} [mime] the mime type
   * @param {boolean} [recurse=false] whether to recurse
   * @return {[files]} an array of files
   */
  ns.getPileOfFiles = function ( path , mime , recurse ) {
  
    ns.checkService();
    var pile, startFolder;
    
    // first check if the path is an id or a path
    try {
      startFolder = ns.service.getFolderById (path);
    }
    catch(err) {
      startFolder = ns.getFolderFromPath (path);
    }
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
      var it = folder.getFolders();
      while (it.hasNext()) {
        pile = recurseFolders (it.next() , mime , pile);
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
      var it  = mime ? folder.getFilesByType(mime) : folder.getFiles();
      var files= [], folderPath = ns.getPathFromFolder (folder);

      while (it.hasNext()) {
        var file = it.next();
        files.push({
          file:file,
          folder:folder,
          path:folderPath  + file.getName()
        });
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
    
    return cUseful.Utils.expBackoff ( function () {
      return folder.getFilesByName (filename);
    });
    
  };
  
  /**
  * get a folder from a path like /abc/def/hgh
  * @param {string} path the path
  * @return {Folder} a folder
  */
  ns.getFolderFromPath = function (path) {
        
    ns.checkService();
    
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


