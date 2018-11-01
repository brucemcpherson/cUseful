/**
* Utils contains useful functions for working with sheets
* @namespace
*/
var SheetUtils = (function (ns) { 
  
  /**
  * given a range and a property name, fill it with a value
  * @param {Range} range the range
  * @param {string} propertyName the property name
  * @param {*|function} fillValue the value to fill with, or function to create a value
  * @param {Range} [headerRange=] an optional range for the headers, default is first data row
  * @return {range} for chaining
  */
  ns.rangeFill = function (range , propertyName, fillValue, headerRange) {
    
    // camel case up property name
    var name = propertyName.slice(0,1).toUpperCase() + propertyName.slice(1);
    if (typeof range['get'+name] !== typeof range['set'+name] || 
        typeof range['set'+name] !== 'function') {
      throw new Error (name + ' should be a property of a range with a getter and setter');
    }
    
    // we'll always need the values to pass to a function, and also get the current properties
    var values = range.getValues();
    
    // set up default headers
    columnNames = headerRange ? headerRange.getValues()[0] : values[0]; 
    if (columnNames.length != values[0].length) {
      throw new Error ('headers are length ' + columnNames.length + 
                       ' but should be ' + values[0].length);
    }
    // these are the properties that will be set                 
    var properties =  name === 'Values' ? values : range['get'+name]();
    
    // iterate
    return range['set'+name](
      values.map(function(row,rowIndex) {
        return row.map(function(cell,colIndex) {
          return typeof fillValue === 'function' ? 
            fillValue ({
              value:cell,
              propertyValue:properties[rowIndex][colIndex],
              columnIndex:colIndex, 
              rowValues:row,
              rowIndex:rowIndex,
              propertyValues:properties,
              values:values,
              range:range,
              propertyName:propertyName,
              columnNames:columnNames,
              columnName:columnNames[colIndex],
              is:function(n) { return columnNames[colIndex] === n; }
            }) : fillValue;
        });
      })
    );
  };
  
  return ns;
}) (SheetUtils || {});
