const a = require("./fixtures/articles.json");
const nlp = require("wink-nlp-utils");
const distance = require("wink-distance");

function summarizeArticle(article, maxLength) {
  const bagsOfWords = [];
  //	try{
  const sentences = nlp.string.sentences(article.contentAsText ?? "");
  //		}
  //	catch(e){
  //		console.log(e.message)
  //		}
  for (i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    bagsOfWords.push(nlp.tokens.bagOfWords(nlp.string.tokenize(sentence)));
  }

  const normalisedCosines = [];
  for (i = 0; i < bagsOfWords.length; i++) {
    let cumulativeCosine = 0;
    for (j = 0; j < bagsOfWords.length; j++) {
      cumulativeCosine += distance.bow.cosine(bagsOfWords[i], bagsOfWords[j]);
    }
    normalisedCosines.push(cumulativeCosine / bagsOfWords.length);
  }

  //	https://stackoverflow.com/questions/46622486/what-is-the-javascript-equivalent-of-numpy-argsort
  const sortSentencesByCosine = (arr1, arr2) =>
    arr1
      .map((item, index) => [arr2[index], item]) // add the args to sort by
      .sort(([arg1], [arg2]) => arg2 - arg1) // sort by the args
      .map(([, item]) => item); // extract the sorted items

  //		try{
  const sortedSentences = sortSentencesByCosine(sentences, normalisedCosines);
  //		}
  //		catch(e){
  //			console.log(e.message)
  //		}

  const summary = [];
  let summaryLength = 0;
  for (let i = 0; i < sortedSentences.length; i++) {
    summary.push(sortedSentences[i]);
    summaryLength += sortedSentences[i].length;
    if (summaryLength > maxLength) {
      break;
    }
  }

  return summary.join("\n");
}

const maxLength = 400; //	Character limit
let failedArticles = 0;
a["articles"].forEach((s) => {
  try {
    console.log(
      `\n---\nURL:${s.url}\nTITLE:${s.title}\n${summarizeArticle(s, maxLength)}`
    );
  } catch (error) {
    console.log("error", error);
    failedArticles += 1;
  }
});

console.log(
  `Processed ${a["articles"].length - failedArticles}/${
    a["articles"].length
  } (${(1 - failedArticles / a["articles"].length) * 100}%)`
);
