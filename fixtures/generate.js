const { parse } = require("@postlight/mercury-parser");
const hastParser = require("hast-util-raw");
const { select } = require("hast-util-select");
const HastToString = require("hast-util-to-string");
const axios = require("axios");
const { inspect } = require("util");
const fs = require("fs");
const { join } = require("path");
const { urls } = require("./urls.json");

const fixtures = urls.map(async (url) => {
  let content = "";
  try {
    const response = await axios.get(url, {
      headers: {
        DNT: "1",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Language": "en-GB,en;q=0.9,en-US;q=0.8,it;q=0.7",
        "Cache-Control": "max-age=0",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://www.google.com/",
        Cookie: "foo=bar;bar=foo",
      },
      timeout: 30 * 1000,
    });
    content = response.data ?? "";
  } catch (error) {
    prettyAxiosErrors(error)({
      not200: (response) => {
        `GET ${url.toString()} ${response.status}\n${inspect(
          response.headers
        )}\n${inspect(response.data)}`;
      },
      noResponse: (request) => {
        `No response: GET ${url.toString()}`;
      },
      orElse: (message) => {
        `GET ${url.toString()} unknown error message ${message}`;
      },
    });
  }

  const hast = isStringNonEmpty(content)
    ? parseHtml(content)
    : { type: "root", children: [] };

  const ogDescriptionElement = select('meta[property="og:description"]', hast);
  const descriptionElement = select('meta[name="description"]', hast);
  const title = select("title", hast);

  const article = await parseContent(url.toString(), { html: content ?? "" });
  const articleAsText = isStringNonEmpty(article.content)
    ? HastToString(parseHtml(article.content))
    : undefined;

  return {
    url,
    title:
      article.title ?? (title ? HastToString(title) : undefined) ?? "No title",
    content: isStringNonEmpty(article.content) ? article.content : undefined,
    contentAsText: articleAsText,
    publishedDate: article.date_published,
    description: descriptionElement
      ? descriptionElement?.properties?.content
      : undefined,
    ogDescription: ogDescriptionElement
      ? ogDescriptionElement?.properties?.content
      : undefined,
  };
});

Promise.all(fixtures).then((articles) => {
  fs.writeFileSync(
    join(__dirname, "articles.json"),
    JSON.stringify({ articles }, null, 2)
  );
});

function isStringNonEmpty(value) {
  return isString(value) && value.trim().length > 0;
}

function parseContent(url, parseOptions) {
  if (!!parseOptions && !isStringNonEmpty(parseOptions.html)) {
    return Promise.resolve({
      title: undefined,
      content: undefined,
      date_published: undefined,
    });
  }
  return parse(url, parseOptions)
    .then((it) => {
      if (!it) {
        return {
          title: undefined,
          content: undefined,
          date_published: undefined,
        };
      }
      return {
        title: it.title ?? undefined,
        content: it.content ?? undefined,
        date_published: it.date_published ?? undefined,
      };
    })
    .catch((error) => {
      return {
        title: undefined,
        content: undefined,
        date_published: undefined,
      };
    });
}

function isString(value) {
  return {}.toString.call(value) === "[object String]";
}

function parseHtml(content) {
  return hastParser({
    type: "root",
    children: [
      { type: "doctype", name: "html" },
      { type: "raw", value: content ?? "" },
    ],
  });
}

function prettyAxiosErrors(error) {
  return ({ not200, noResponse, orElse }) => {
    if (error.response) {
      return not200.call(null, error.response);
    } else if (error.request) {
      return noResponse.call(null, error.request);
    } else {
      return orElse.call(null, error.message);
    }
  };
}
