/**
 * @namespace UserRegistration
 * uses the property service to track anonymous users
 */
var UserRegistration = (function(ns) {
  
  ns.version = "0.0";
  
  /**
   * register a visit
   * if new user, then create a reg record
   * @param {PropertiesService} props the one to use
   * @param {string} registrationKey the key to use
   * @return {object} the registration object
   */
  ns.register = function (props,registrationKey) {
    
    // get the existing registration or make one
    return ns.get(props, registrationKey) || makeob();

    
    function makeob () { 
      
      var now = new Date().getTime();
      var ob = { 
        id:Utils.generateUniqueString(),
        visits:-1,
        created:now
      };
      return ns.set (props, registrationKey , ob);
    }
    

  };
  
  /**
   * get the registration item for this user
   * @param {PropertiesService} props the prop service to use
   * @param {string} registrationKey the key to use
   * @return {object} the registration object
   */
  ns.get = function (props,registrationKey) {
    return closure_ (props, registrationKey , getProp_ (props, registrationKey));
  };
  
  /**
   * set the registration item for this user
   * @param {PropertiesService} props the prop service to use
   * @param {string} registrationKey the key to use
   * @param {object} ob the registration object
   * @return {object} the registration object
   */
  ns.set = function (props,registrationKey,ob) {
    // increment visits etc.
    ob.visits++;
    ob.version = ns.version;
    ob.lastVisit = new Date().getTime();
    setProp_ (props, registrationKey , ob);
    return closure_ (props, registrationKey , ob);
  };
  
  function getProp_ (props,propKey) {
    return Utils.expBackoff (function () {
      var r = props.getProperty(propKey);
      return r ? JSON.parse(r) : null;
    });
  }
  
  function setProp_ (props,propKey,ob) {
    return Utils.expBackoff (function () {
      return props.setProperty(propKey,JSON.stringify(ob));
    });
  }
  
  function closure_ (props , registrationKey, ob) {
    // make a closure so its easy to update
    if (ob) {
      ob.update = function () {
        return ns.set (props , registrationKey , ob);
      };
      ob.remove = function () {
        return props.deleteProperty (registrationKey);
      };
    }
    return ob;

  }
  return ns;
}) (UserRegistration || {});
