var DriveProper = function (service) {
  
  var service_ = service;
  var self = this;

  self.setService = function (service) {
    service_ = service;
    return ns;
  };
  
  /*
  * add properties to a a file
  * @param {string} fileId 
  * @param {object} ob an object with all the properties to set
  * @param {boolean} [public=false] whether to make this public to all apps
  * @return {object []} the resources that were set
  */
  self.update = function (fileId , ob, public) {
    
    // arratify
    var o = Object.keys (ob).map (function (d) {
      return {
        key:d,
        value:ob[d],
        visibility: public ? "PUBLIC": "PRIVATE"
      }
    });

    // insert property
    o.forEach(function (d) {
      service_.Properties.insert ( d , fileId);
    });
    
    return o;
  };
  
 /*
  * get properties from a file
  * @param {string} fileId 
  * @param {boolean} [all=false] whether to read only this app or public as well
  * @return {object} the resources that were set
  */
  self.get = function (fileId , all) {
    
    return service_.Files.get(fileId)
    .properties.filter (function (d) {
      return all || d.visibility === "PRIVATE";
    })
    .map (function (d) {
      
      return {
        key:d.key,
        value:d.value,
        visibility:d.visibility
      }
    });

  };
  
  /*
   * search for a files wih given properties
  * @param {object} ob an object with all the properties to search for
  * @param {boolean} [all=false] whether to include all or just for this app
  * @return {string []} the fileids that matched
  */
  self.search = function ( ob , all )  {
    
    var pageToken, consolidated = [];
    var searcher =  Object.keys (ob)
    .map (function (d) {
      return "(" + ("(properties has { key='" + d + "' and value ='" + ob[d] + "' and visibility = 'PRIVATE' })") + 
        (all ? " or (properties has { key='" + d + "' and value ='" + ob[d] + "' and visibility = 'PUBLIC' })" : "") + ")";
    }).join (" and ");
    
    // consolidate chunks
    do  {
      var result = service_.Files.list({q:searcher,pageToken:pageToken});
      pageToken = result.nextPageToken;
      Array.prototype.push.apply (consolidated ,result.items.map (function (d) {
        return d.id;
      }));
                                  
    } while (pageToken && result.items.length);
    return consolidated;
  };
  
  /*
   * remove all or some properties
   * @param {string} fileId the file id
   * @param {ob[]} properties to remove
   * @param {boolean} [public=false] whether to remove private or public
   * @return {object} the resources that are still set
   */
  self.remove = function (fileId , ob , public) {
  
    ob.forEach (function (d) {
      service_.Properties.remove ( fileId , d, {visibility: public ? "PUBLIC" : "PRIVATE"});
    });
    
    return self.get (fileId, true);
  };

};

