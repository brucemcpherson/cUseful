/*

This namespace was extracted and modified from 
https://github.com/tanaikech/ImgApp

The MIT License (MIT)
Copyright (c) 2017 Kanshi TANAIKE

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
var Images = (function (ns) {


  ns.sizer = {
  
    bmp: function (buff) {
      return {
        width: Utils.byte2num(buff.slice(18, 22), true),
        height: Utils.byte2num(buff.slice(22, 26), true),
      };
    
    },
    
    gif: function (buff) {
      return {
        width: Utils.byte2num(buff.slice(6, 8), true),
        height: Utils.byte2num(buff.slice(8, 10), true),
      }
    },
    
    jpg: function (buff) {
      var i, ma;
      i = 0;
      while (i < buff.length) {
        i += 1;
        if ((Utils.byte2hex_num(buff[i])) === "ff") {
          i += 1;
          ma = Utils.byte2hex_num(buff[i]);
          if (ma === "c0" || ma === "c1" || ma === "c2") {
            break;
          } else {
            i += Utils.hex2num(Utils.byte2hex(buff.slice(i + 1, i + 3)));
          }
        }
      }
      return {
        width: Utils.hex2num(Utils.byte2hex(buff.slice(i + 6, i + 8))),
        height: Utils.hex2num(Utils.byte2hex(buff.slice(i + 4, i + 6))),
      };
    },
    
    png: function (buff) {
      return {
        width: Utils.byte2num(buff.slice(16, 20), false),
        height: Utils.byte2num(buff.slice(20, 24), false),
      }
    }
  };
  
  
  const types = {
    png:["image/png"],
    bmp:["image/bmp"],
    jpg:["image/jpeg", "image/jpg"],
    gif:["image/gif"]
  };
  
  /** 
   * @param {blob} a blob
   * @return {object} various dimensions
   */
  ns.getInfo = function (blob) {
    var res;
    
    // function to extract 
    const buff = blob.getBytes();
    const contentType = blob.getContentType();
    
    // map to type
    const type = Object.keys(types).filter (function (d) {
      return types[d].indexOf(contentType) !== -1;
    })[0];
    
    if (!type) throw "unable to process content type " + contentType;
    if (!ns.sizer[type]) throw 'missing method for converting type ' + type;
    
    // do the work
    const info = ns.sizer[type] (buff);
    
    // add some more stuff
    info.blob = blob;
    info.type = type;
    info.contentType = contentType;
    info.size = buff.length;
    info.name = decodeURIComponent(blob.getName());
    const match = info.name.match (/\w+(?:\.\w+)*$/);
    info.fileName = match && match[0].toString();
    return info;

  };
  


  return ns;
})({});




