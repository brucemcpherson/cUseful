/**
 * this namespace will have various stats and maths functions
 */
var Maths = (function (ns) {
  /**
   * create a skewed distribution
   * src - https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
   * @param {number} min min value
   * @param {number} max max value
   * @param {number} skew a value of 1 will give a normal distribution < 1 bias to the right, > 1 bias to the left
   */

  ns.skewedDistribution = function  (min, max, skew) {

    var u = 0;
    var v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    var num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) num = ns.skewedDistribution(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
    return num;
  };


  return ns
})({})
