/**
 * for rough matching
 */
var Rough = function () {
  const self = this;
  
  // default options
  const CLEANER_OPTIONS = {
    stem: true,
    stub: true ,
    unAccent: true,
    stopwords: true,
    language: "en",
    extraStops:[],
    min:0.6,
    scores: {
      stubMatch: 10,
      stubPenalty: -1,
      stemMatch: 12,
      stemPenalty: -1,
      wordMatch: 20 ,
      wordPenalty: -1,
      orderMatch: 1,
      stubPartialMatch: 40,
      stubPartialPenalty: -7,
      initialMatch: 3,
      initialPenalty: -4,
      reverseMatch: 2,
      reversePenalty: -4
    }
  };
  
  var cleanerOpts, referenceList;
  /**
   * set options
   * @param {object} options set options
   */
  self.init =  function (options) {
  
    // extend out the default options
    cleanerOpts = Utils.vanExtend (  CLEANER_OPTIONS , options);

    // init && add award as a useless word to the normal lot
    Stopwords.setOptions (cleanerOpts).add (cleanerOpts.extraStops);
    return self;
  };
  
  /**
   * sets a reference list for this instance
   * @param {[object]} data array of obs
   * @param {function} how to get a row
   * @return self
   */
  self.setReferenceList = function ( data , getRow ) {
    referenceList = data.map (function (d) {
      return self.cleaner( getRow ? getRow (d) : d) ;
    });
    return self;
  };
  
  self.getReferenceList = function () {
    if (!referenceList) throw 'use setReference list to make one';
    return referenceList;
  };
  /**
   * roughly find
   * @param {[[string]]}  [refList] a cleaned reference list {phrase:string, words:[string], tokens: [string]}
   * @param {string} inputPhrase the phrase to find
   * @return ([object]) matches {phrase:{score:number, }
   */
  self.matcher = function ( inputPhrase , refList) {
  
    // clean the phrase
    var cleanedList = refList || self.getReferenceList();
    
    cleanedPhrase = self.cleaner (inputPhrase);
    const stubs = cleanedPhrase.stubs || [];
    const phrase = cleanedPhrase.phrase || "";
    const words = cleanedPhrase.words || [];
    const stems = cleanedPhrase.stems || [];
    const scores = cleanerOpts.scores;
    const initials = words.map (function (d) {
      return d.slice(0,1);
    });
    
    // get a score for each item in the list
    return cleanedList.map (function (row, index) {

      const scoreDetails = {
        wordMatch:scorer ( scores,words, row.words , "wordMatch" , "wordPenalty"),
        stubMatch:scorer ( scores,stubs, row.stubs , "stubMatch" , "stubPenalty"),
        stemMatch:scorer ( scores,stems, row.stems , "stemMatch" , "stemPenalty"),
        initialMatch:scorer ( scores, initials, row.initials , "initialMatch" , "initialPenalty"),
        reverseMatch:scorer ( scores, row.stubs, stubs , "reverseMatch" , "reversePenalty"),
        stubPartial: scorer ( scores, stubs, row.stubs , "stubPartialMatch" , "stubPartialPenalty", function (inp, str) {
          return inp.some(function(d) {
            return d.indexOf (str) !== -1;
          }) ? 0 : -1;
        })
      };
      const score = Object.keys(scoreDetails).reduce (function (p,c) {
        return p + scoreDetails[c];
      },0);
      

      // normalize higher scores a little..
      const maxScore = (row.words.length * scores.wordMatch) + 
        (stubs.length * scores.stubMatch) + 
        (stems.length * scores.stemMatch) + 
        (stems.length * scores.orderMatch) + 
        (stubs.length * scores.orderMatch * 2) + 
        (words.length * scores.orderMatch * 2) + 
        (words.length * scores.initialMatch) + 
        (row.stubs.length * scores.reverseMatch) + 
        (stubs.length * scores.stubPartialMatch) ;    
      
      return {
        score: maxScore ? score/maxScore : 0,
        row: row ,
        input: cleanedPhrase,
        index: index,
        row: row,
        maxScore: maxScore,
        rawScore: score,
        scoreDetails: scoreDetails
      }
    })
    .filter (function (d) {
      return d.score >= cleanerOpts.min;
    })
    .sort (function (a,b) {
      return b.score - a.score;
    });
  };
  
  // generic scorer
  function scorer( scores, input , rowInput , match, penalty , indexMethod) {
    //  a score  word matching
    var score = 0;
    indexMethod = indexMethod || function (inp,str) {
      return inp.indexOf(str);
    };
    
    if (input.length) {
      // stubs in the row
      const mover = -1;
      input.forEach (function (s) {
        // find the word/stem/stub in the reference row
        const ix = indexMethod ( rowInput, s);
        if (ix === -1) {
          score += scores[penalty];
        }
        else {
          score += scores[match];
          if (ix > mover) score += scores.orderMatch;
          mover = ix;
        }
      });
    }
    return score;
  }

  
   /**
   * @param {string} phrase the phrase to clean
   * @param {function} [synonyms] a function to replace words with synonyms of required
   * @return {[object]} the cleaned phrase as tokens
   */
  self.cleaner = function (phrase,synonyms) {
    
    // remove accents
    if (cleanerOpts.unAccent) {
      phrase = RemoveAccents.remove (phrase);
    }
    

    // spilt and remove unworthy separators
    phrase = phrase.toLowerCase().replace (/[\W_]/g," ").replace (/\s+/g," ").replace(/^\s/,"").replace(/\s$/,"");
    var words = phrase.split(" ");
    if (synonyms) words = synonyms(words);
    
    //remove stopwords
    if (cleanerOpts.stopwords) {
      //  but we need to have at leaset one word
       var r = Stopwords.clean (words);
       words = r.length ? r : [words[0]];
    };
    
    
    // next do any stemming (note that stemming that results in a stop word will mean it's kept
    var stems = [];
    if (cleanerOpts.stem) {
      stems = words.map ( function (d) {
        return Stemmer.getStem (d);
      });
    }
    
    
    // next get rid of stop words
    // note that the words may be different from the stems because unstemmed words may not match a stemmed list
    /*
    if (cleanerOpts.stopwords) {
      //  but we need to have at lease one word
       var r = Stopwords.clean (words);
       words = r.length ? r : [r[0]];
       r = Stopwords.clean (stems);
       stems = stems.length ? stems : [r[0]];
    };
    */
    // finally make a stub
    if (cleanerOpts.stub) {
      var stubs = (cleanerOpts.stem ? stems : words).map (function (d) { 
        return Stubber.make(d);
      });
    }

    return {
      phrase:phrase,
      words:words,
      stubs:stubs,
      stems:stems,
      initials:words.map (function (d) {
        return d.slice(0,1);
      })
    };
  };

}
