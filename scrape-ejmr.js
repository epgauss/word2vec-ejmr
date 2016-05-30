var request = require('request');
var async = require('async');
var cheerio = require('cheerio');

var PAGE_URL = 'http://www.econjobrumors.com/page/PAGE_NO';
var TOPIC_URL = 'http://www.econjobrumors.com/topic/TOPIC_ID';

var MESSAGES_PER_PAGE = 20;

var fs = require('fs');
fs.writeFileSync('corpus.txt', '');

var pageNumbers = []
for (var i = 2; i < 6598; i++) {
  pageNumbers.push(i)
};

function scrapePage(pageNumber, callback) {
  var url = PAGE_URL.replace('PAGE_NO', pageNumber);
  request(url, function (err, resp, body) {
    var $ = cheerio.load(body);
    var table = $('#latest').find('tr');
    var posts = table.map(function (i, elem) {
      if ($(this).find('td').length == 5) {
        var post = {};
        $(this).find('td').each(function (j, elemTd) {
          if (j == 0) {
            post.title = $(elemTd).text();
            post.url = $(elemTd).find('a').attr('href');
          }
          if (j == 1) {
            post.posts = $(elemTd).text();
          }
          if (j == 2) {
            post.views = $(elemTd).text();
          }
          if (j == 3) {
            post.votes = $(elemTd).text();
          }
          if (j == 4) {
            post.freshness = $(elemTd).text();
          }
        });
        return post;
      }
    }).get();
    async.eachLimit(posts, 10, scrapePost, function (err) {
      if (err) {
        console.err(err);
      } else {
        console.log('Page ' + pageNumber + ' done');
      }
      callback();
    });
  });
}

function scrapePost(post, callback) {
  var pageMax = Math.ceil(post.posts / 20);
  var pageCounts = []
  for (var i = 1; i <= pageMax; i++) {
    pageCounts.push(post.url + '/page/' + i);
  }
  async.each(pageCounts, scrapePostCount, function (err) {
    if (err) {
      console.err(err);
    } else {
      console.log('    Post ' + post.title + ' done');
    }
    callback();
  });
}

function scrapePostCount(postCountUrl, callback) {
  request(postCountUrl, function (err, resp, body) {
    var $ = cheerio.load(body);
    var postTexts = $(body).find('.post').map(function (i, elem) {
      return $(this).find('p').text().trim();
    }).get();
    fs.appendFile('corpus.txt', postTexts.join('\n') + '\n', function (err) {
      if (err) {
        console.err(err);
      }
      callback();
    });
  });
}

async.eachSeries(pageNumbers, scrapePage, function (err) {
  if (err) {
    console.err(err);
  } else {
    console.log('All pages done');
  }
});
