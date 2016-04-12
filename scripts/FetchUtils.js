/**
* Utils contains useful functions for working with urlfetchapp
* @namespace FetchUtils
*/
var FetchUtils = (function (ns) {

  /**
  * to keep this namespace dependency free
  * this must be run to set the driveappservice before it can be used
  * @param {fetchapp} dap the fetchapp
  * @return {FetchUtils} self
  */
  ns.setService = function (dap) {
    ns.service = dap;
    return ns;
  };
  
  ns.checkService = function () {
    if(!ns.service) {
      throw 'please do a FetchUtils.setService (yoururlfetchapp) to inialise namespace';
    }
  };
  
  /**
  * restart a resumable upload
  * @param {string} accessToken the token
  * @param {blob} contblobent the content
  * @param {string} location the location url
  * @param {string} start the start position
  * @param {function} [func] a func to call after each chunk
  * @return {object} the status from the last request
  */
  ns.resumeUpload = function (accessToken,blob,location,start,func) {
    
    var MAXPOSTSIZE = 1024*1024*8;
    
    ns.checkService();
    
    
    //get the content and make the resource
    var content = blob.getBytes();
    var file = {
      title: blob.getName(),
      mimeType:blob.getContentType()
    };
    
    var chunkFunction = func || function ( status) {
      // you can replace this function with your own.
      // it gets called after each chunk
      
      // do something on completion
      if (status.done) {
        Logger.log (
          status.resource.title + '(' + status.resource.id + ')' + '\n' +
          ' is finished uploading ' + 
          status.content.length + 
          ' bytes in ' + (status.index+1) + ' chunks ' +
          ' (overall transfer rate ' + Math.round(content.length*1000/(new Date().getTime() - status.startTime)) + ' bytes per second)'
          );
      }
      
      // do something on successful completion of a chunk
      else if (status.success) {
        Logger.log (
          status.resource.title + 
          ' is ' + Math.round(status.ratio*100) + '% complete ' +
          ' (chunk transfer rate ' + Math.round(status.size*1000/(new Date().getTime() - status.startChunkTime))  + ' bytes per second)' +
            ' for chunk ' + (status.index+1)
            );
      }
      
      // decide what to do on an error
      else if (response.getResponseCode() === 503 ) {
        throw 'error 503 - you can try restarting using ' + status.location;
      }
      
      
      // its some real error
      else {
        throw response.getContentText() + ' you might be able to restart using ' + location;
      }
      
      // if you want to cancel return true
      return false;
    };
    
    var startTime = new Date().getTime();
    // now do the chunks
    var pos = 0, index = 0 ;
    do {
      
      // do it in bits
      var startChunkTime = new Date().getTime();
      var chunk = content.slice (pos , Math.min(pos+MAXPOSTSIZE, content.length));
      var options = {
        contentType:blob.getContentType(),
        method:"PUT",
        muteHttpExceptions:true,
        headers: {
          "Authorization":"Bearer " + accessToken,
          "Content-Range": "bytes "+pos+"-"+(pos+chunk.length-1)+"/"+content.length
        }
      };
      
      
      // load this chunk of data
      options.payload = chunk;
      
      // now we can send the file
      // but .... UrlFetch failed because too much upload bandwidth was used
      var response = Utils.expBackoff (function () {
        return ns.service.fetch (location, options) ;
      });
      
      // the actual data size transferred
      var size = chunk.length;

      if (response.getResponseCode() === 308 ) {
        var ranges = response.getHeaders().Range.split('=')[1].split('-');
        var size = parseInt (ranges[1],10) - pos + 1;
        if (size !== chunk.length ) {
          Logger.log ('chunk length mismatch - sent:' + chunk.length + ' but confirmed:' + size + ':recovering by resending the difference');
        }
      };
      
      // catch the file id 
      if (!file.id) {
        try {
          file.id = JSON.parse(response.getContentText()).id;
        }
        catch (err) {
          // this is just in case the contenttext is not a proper object
        }
      }
      
      var status = {
        start:pos,
        size:size,
        index:index,
        location:location,
        response:response,
        content:content,
        success:response.getResponseCode() === 200 || response.getResponseCode() === 308,
        done:response.getResponseCode() === 200,
        ratio:(size + pos) / content.length,
        resource:file,
        startTime:startTime,
        startChunkTime:startChunkTime
      };
      
      index++;
      pos += size;
      
      // now call the chunk completefunction
      var cancel = chunkFunction ( status );
      
    } while ( !cancel && status.success && !status.done);
    
    return status;  
  };
  
  /**
  * resumable upload
  * @param {string} accessToken an accesstoken with Drive scope
  * @param {blob} blob containg the data, type and name
  * @param {string} [folderId] the folderId to be the parent
  * @param {function} func a func to call after each chunk
  * @return {object} the status from the last request
  */
  ns.resumableUpload = function (accessToken,blob,folderId,func) {
    
    ns.checkService();
    /**
    * @param {object} status the status of the transfer
    *        status.start the start position in the content just processed
    *        status.size the size of the chunk
    *        status.index the index number (0 base) of the chunk
    *        status.location the restartable url
    *        status.content the total content
    *        status.response the httr response of this attempt
    *        status.success whether this worked (see response.getResponseCode() for more
    *        status.done whether its all done successfully
    *        status.ratio ratio complete
    *        status.resource the file resource
    *        status.startTime timestamp of when it all started
    *        status.startChunkTime timestamp of when this chunk started
    * @return {boolean} whether to cancel (true means cancel the upload)
    */
    
    
    //get the content and make the resource
    var content = blob.getBytes();
    var file = {
      title: blob.getName(),
      mimeType:blob.getContentType()
    };
    
    // assign to a folder if given
    if (folderId) {
      file.parents = [{id:folderId}];
    }
    
    // this sends the metadata and gets back a url
    
    var resourceBody = JSON.stringify(file);
    var headers =  {
      "X-Upload-Content-Type":blob.getContentType(),
      "X-Upload-Content-Length":content.length ,
      "Authorization":"Bearer " + accessToken,
    };
    
    var response = Utils.expBackoff( function () {
      return ns.service.fetch ("https://www.googleapis.com/upload/drive/v2/files?uploadType=resumable", {
        headers:headers,
        method:"POST",
        muteHttpExceptions:true,
        payload:resourceBody,
        contentType: "application/json; charset=UTF-8",
        contentLengthxx:resourceBody.length
      });
    });
    
    if (response.getResponseCode() !== 200) {
      throw 'failed on initial upload ' + response.getResponseCode();
    }
    
    
    // get the resume location
    var location = getLocation (response);
    
    return ns.resumeUpload (accessToken,blob,location,0,func);
    
    
    function getLocation (resp) {
      if(resp.getResponseCode()!== 200) {
        throw 'failed in setting up resumable upload ' + resp.getContentText();
      }
      
      // the location we need comes back as a header
      var location = resp.getHeaders().Location;
      if (!location) {
        throw 'failed to get location for resumable uploade';
      }
      return location;
    }
    
  };
  
  
  return ns;
})(FetchUtils || {});