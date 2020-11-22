const Summary = require("node-summary");
const { articles } = require("./fixtures/articles.json");
const { summarice } = require(".");

async function run() {
  try {
    const comparison = await Promise.all(
      articles.map((article, index) => {
        return summarise(article.title ?? "", article.contentAsText ?? "").then(
          (text) => {
            return {
              current: summarice(article),
              "node-summarize": text,
            };
          }
        );
      })
    );

    console.log(comparison);
  } catch (error) {
    console.log(error);
  }
}

run();

async function summarise(title, content) {
  return new Promise((resolve, reject) => {
    Summary.summarize(title, content, function (err, summary) {
      if (err) {
        return reject(err);
      }
      resolve(summary);
    });
  });
}
