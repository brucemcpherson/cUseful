var Stubber = ( function (ns) {

  ns.make = function (text) {
    return text.slice(0, 1) + text.slice(1).replace(/s/g, 'z').replace(/mp/g, 'm').replace(/[yhaeiou]|(.)(?=\1)|(c)(?=k)/g, "");
  };
  
  return ns;
}) ({});



