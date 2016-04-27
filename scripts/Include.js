/**
 *used to include code in htmloutput
 *@nameSpace Include
 */
var Include = (function (ns) {
  
  /**
  * given an array of .gs file names, it will get the source and return them concatenated for insertion into htmlservice
  * like this you can share the same code between client and server side, and use the Apps Script IDE to manage your js code
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.gs =  function (scripts) {
    return '<script>\n' + scripts.map (function (d) {
      // getResource returns a blob
      return ScriptApp.getResource(d).getDataAsString();
    })
    .join('\n\n') + '</script>\n';
  };

  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * @param {string[]} scripts the names of all the scripts needed
  * @param {string} ext file extendion
  * @return {string} the code inside script tags
  */
  ns.html = function (scripts, ext) {
    return  scripts.map (function (d) {
      return HtmlService.createHtmlOutputFromFile(d+(ext||'')).getContent();
    })
    .join('\n\n');
  };
  
  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * inserts css style
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.js = function (scripts) {
    return '<script>\n' + ns.html(scripts,'.js') + '</script>\n';
  };
  
  /**
  * given an array of .html file names, it will get the source and return them concatenated for insertion into htmlservice
  * like this you can share the same code between client and server side, and use the Apps Script IDE to manage your js code
  * @param {string[]} scripts the names of all the scripts needed
  * @return {string} the code inside script tags
  */
  ns.css = function (scripts) {
    return '<style>\n' + ns.html(scripts,'.css') + '</style>\n';
  };
  

  return ns;
})(Include || {});

