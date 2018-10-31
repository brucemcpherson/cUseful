
/**
* MIT license
* https://github.com/fergiemcdowall/stopword/blob/master/LICENSE
*/
var Stopwords = (function (ns) {
  var stopwords,lng = "en", options  ={} ,words;
  
  const init = function () {
    ns.setOptions ( {
      language:"en",
      unAccent: true
    });
    return ns;
  };
  
  const prepareWord = function (word) {
    // removes accent and stems if required
    var x = word.toLowerCase();
    x = options.unAccent ? RemoveAccents.remove (x) : x;
    x = options.stem ? Stemmer.getStem (x) : x ;
    return x;
  };
  
  ns.setOptions = function (opts) {
    // only do this if the options have changed
    if (opts.language !== options.language || opts.unAccent !== options.unAccent) {
      options = opts;
      const w = getWords(options.language || lng);
      if (!w) {
        throw new Error ("supported languages are " + Object.keys(words));
      }
      lng = options.language || lng;
      
      // take a copy of stopwords as an object so it will be quicker to index
      stopwords =  w.reduce (function (p,c) {
        const x = prepareWord(c);
        p[x] = c;
        return p;
      },{});
      
      return ns;
    }
    
    return ns;
  };
  
  ns.add = function (tokens) {
    if (!stopwords) init();
    if (!Array.isArray(tokens)   ){
      throw new Error ('expected Stopwords.add(Array)')
    }
    tokens.forEach (function (d) {
      const x = prepareWord(d);
      stopwords[x] = d;
    });
   
    return ns;
  };
  
  ns.clean = function(tokens) {
    if (!stopwords) init();
    if (!Array.isArray(tokens)   ){
      throw new Error ('expected Stopwords.clean(Array)')
    }
    return tokens.filter(function (value) {
      return !stopwords.hasOwnProperty (value);
    })
    
  };
  
  
  function getWords  (lng) {
    return { 
      
      en:  [
        'about', 'after', 'all', 'also', 'am', 'an', 'and', 'another', 'any', 'are', 'as', 'at', 'be',
        'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'came', 'can',
        'come', 'could', 'did', 'do', 'each', 'for', 'from', 'get', 'got', 'has', 'had',
        'he', 'have', 'her', 'here', 'him', 'himself', 'his', 'how', 'if', 'in', 'into',
        'is', 'it', 'like', 'make', 'many', 'me', 'might', 'more', 'most', 'much', 'must',
        'my', 'never', 'now', 'of', 'on', 'only', 'or', 'other', 'our', 'out', 'over',
        'said', 'same', 'see', 'should', 'since', 'some', 'still', 'such', 'take', 'than',
        'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
        'through', 'to', 'too', 'under', 'up', 'very', 'was', 'way', 'we', 'well', 'were',
        'what', 'where', 'which', 'while', 'who', 'with', 'would', 'you', 'your', 'a', 'i'
      ],
      
      fr: ['?tre', 'avoir', 'faire',
           'a',
           'au',
           'aux',
           'avec',
           'ce',
           'ces',
           'dans',
           'de',
           'des',
           'du',
           'elle',
           'en',
           'et',
           'eux',
           'il',
           'je',
           'la',
           'le',
           'leur',
           'lui',
           'ma',
           'mais',
           'me',
           'm?me',
           'mes',
           'moi',
           'mon',
           'ne',
           'nos',
           'notre',
           'nous',
           'on',
           'ou',
           'o?',
           'par',
           'pas',
           'pour',
           'qu',
           'que',
           'qui',
           'sa',
           'se',
           'ses',
           'son',
           'sur',
           'ta',
           'te',
           'tes',
           'toi',
           'ton',
           'tu',
           'un',
           'une',
           'vos',
           'votre',
           'vous',
           'c',
           'd',
           'j',
           'l',
           '?',
           'm',
           'n',
           's',
           't',
           'y',
           '?t?',
           '?t?e',
           '?t?es',
           '?t?s',
           '?tant',
           'suis',
           'es',
           'est',
           'sommes',
           '?tes',
           'sont',
           'serai',
           'seras',
           'sera',
           'serons',
           'serez',
           'seront',
           'serais',
           'serait',
           'serions',
           'seriez',
           'seraient',
           '?tais',
           '?tait',
           '?tions',
           '?tiez',
           '?taient',
           'fus',
           'fut',
           'f?mes',
           'f?tes',
           'furent',
           'sois',
           'soit',
           'soyons',
           'soyez',
           'soient',
           'fusse',
           'fusses',
           'f?t',
           'fussions',
           'fussiez',
           'fussent',
           'ayant',
           'eu',
           'eue',
           'eues',
           'eus',
           'ai',
           'as',
           'avons',
           'avez',
           'ont',
           'aurai',
           'auras',
           'aura',
           'aurons',
           'aurez',
           'auront',
           'aurais',
           'aurait',
           'aurions',
           'auriez',
           'auraient',
           'avais',
           'avait',
           'avions',
           'aviez',
           'avaient',
           'eut',
           'e?mes',
           'e?tes',
           'eurent',
           'aie',
           'aies',
           'ait',
           'ayons',
           'ayez',
           'aient',
           'eusse',
           'eusses',
           'e?t',
           'eussions',
           'eussiez',
           'eussent',
           'ceci',
           'cela',
           'cet',
           'cette',
           'ici',
           'ils',
           'les',
           'leurs',
           'quel',
           'quels',
           'quelle',
           'quelles',
           'sans',
           'soi'
          ]
    }[lng];
  }
  
  
  
  return ns;
  
})({});



