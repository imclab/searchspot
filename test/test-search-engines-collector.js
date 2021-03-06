/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, browser:true, es5:true,
  indent:2, maxerr:50, devel:true, node:true, boss:true, white:true,
  globalstrict:true, nomen:false, newcap:true*/

/*global escape:true */

"use strict";

var data = require('sdk/self').data,
    chrome = require('chrome'),
    DataURL = require('sdk/url').DataURL,
    SearchEnginesCollector = require("search-engines-collector")
                              .SearchEnginesCollector;


// borrowed from addon-kit/tests
var testPageMod = require("pagemod-test-helpers").testPageMod;

var TEST_FILE = "test-search-engines-collector.js";

var TEST_FOLDER_URI = module.uri.split(TEST_FILE)[0];

//console.log("TEST_FOLDER_URI", TEST_FOLDER_URI);

var HTML_FILE = "fixtures/test-search-engines-collector-pagemod.html";
var HTML_URI = module.uri.replace(TEST_FILE, HTML_FILE);

//console.log("HTML_FILE", HTML_FILE, "HTML_URI", HTML_URI);

var WIKIPEDIA_OPENSEARCH_FILE = "fixtures/wikipedia-opensearch.xml";
var WIKIPEDIA_URI = module.uri.replace(TEST_FILE, WIKIPEDIA_OPENSEARCH_FILE);

//console.log("WIKIPEDIA_OPENSEARCH_FILE", WIKIPEDIA_OPENSEARCH_FILE, "WIKIPEDIA_URI", WIKIPEDIA_URI);

var FOURSQUARE_OPENSEARCH_FILE = "fixtures/foursquare-opensearch.xml";
var FOURSQUARE_URI = module.uri.replace(TEST_FILE, FOURSQUARE_OPENSEARCH_FILE);

//console.log("FOURSQUARE_OPENSEARCH_FILE", FOURSQUARE_OPENSEARCH_FILE, "FOURSQUARE_URI", FOURSQUARE_URI);

var WORDPRESS_OPENSEARCH_FILE = "fixtures/wordpress-opensearch.xml";
var WORDPRESS_URI = module.uri.replace(TEST_FILE, WORDPRESS_OPENSEARCH_FILE);

// Borrowed from: test-harness/tests/test-tmp-file.js
// Utility function that synchronously reads local resource from the given
// `uri` and returns content string. Read in binary mode.
function readBinaryURI(uri) {
  var channel = chrome.Cc["@mozilla.org/network/io-service;1"]
                      .getService(chrome.Ci.nsIIOService)
                      .newChannel(uri, "UTF-8", null);
  var stream = chrome.Cc["@mozilla.org/binaryinputstream;1"]
                     .createInstance(chrome.Ci.nsIBinaryInputStream);
  stream.setInputStream(channel.open());

  var data = "";
  while (true) {
    var available = stream.available();
    if (available <= 0) {
      break;
    }
    data += stream.readBytes(available);
  }
  stream.close();

  return data;
}

exports.testPageModCollector = function (test) {
  var workerDone = false,
      callbackDone = null;
  testPageMod(test, HTML_URI,
              [{ include: HTML_URI,
                 contentScriptWhen: 'end',
                 contentScriptFile: data.url("search-engines-collector-pagemod.js"),
                 onAttach: function (worker) {
                  worker.on('message', function (data) {
                    var link = data.pop();
                    test.assertEqual(link.site, HTML_URI);
                    test.assertEqual(link.name, "FourSquare");
                    test.assertEqual(link.opensearch, "/foursquare-opensearch.xml");
                    workerDone = true;
                    if (callbackDone) {
                      callbackDone();
                    }
                  });
                }
              }],
    function (win, done) {
      (callbackDone = function () {
        if (workerDone) {
          done();
        }
      })();
    }
  );
};

exports.testNotAllowedCollector = function (test) {

  SearchEnginesCollector.allowed = false;

  var link = [{ site : "http://www.example.com", name : "Example", opensearch : "/example-opensearch.xml" }];
  test.assertNull(SearchEnginesCollector.collect(link));

  SearchEnginesCollector.allowed = true;
  test.assertEqual(SearchEnginesCollector.collect(link), link);
};

exports.testCollectorWikipedia = function (test) {
  SearchEnginesCollector.allowed = true;
  SearchEnginesCollector.on("engine", function onCollectorWikipedia(collected) {
    SearchEnginesCollector.removeListener("engine", onCollectorWikipedia);

    test.assertEqual(collected.name, "Wikipedia (en)", "Wikipedia name is correct");
    test.assertEqual(collected.queryURL, "http://en.wikipedia.org/w/index.php?title=Special:Search&search={searchTerms}", "Wikipedia Query URL is correct");
    test.assertEqual(collected.suggestionURL, "http://en.wikipedia.org/w/api.php?action=opensearch&search={searchTerms}&namespace=0", "Wikipedia Suggestion URL is correct");
    test.assertEqual(collected.icon, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABo0lEQVQ4ja2TO4siQRSFC5lJOlUjEQQDE8FYRREFBUEwMDEcEJPGH2BsZiQoBgaiYCoiBv4FwRZDTQQROxE0sum2H3wT7EzDrLvs80Z1LnW+OkXVFcAr8Aas+f1af3hexcfib+tN/OHJT0mEbdvouo6u6xiGAeBq0zRxHMfVjuNgmqarbdtGbLdbMpkMQgh6vR6O41AoFBBCMBwOOZ1OJBIJcrkcqqoym83wer2Uy2V2ux0C4Hg88vLywnw+B0DTNEKhEN1uF4BsNsvtdgPg8XiQTCaxLAvgGwCgWq2SSqXcyw0GA4LBINPplHa77fYnkwn9ft/VLmCz2SCEYLVaAWBZFuFwmFgshq7rrqFYLKJp2jPgM2qlUnG1LMv4fD43rqIoNJvNL8/wBbBcLvF4PBwOBwBKpRJ+v5/xeAxAvV5HVdWfAwCi0SiyLLNYLOh2u7RaLSKRCJfLhVqt9v32Z8BoNEKSJPL5PIZhcL1ekSSJeDyOoii/BpimSSAQoNPpuL1Go0E6nX4yfwKevvJ+v8dxHFff73fO5/OP/Ov/Mkz/NM7vB+B52iVL10sAAAAASUVORK5CYII=",
                     "Wikipedia Icon is not correct");

    test.done();
  });

  var dataurl = new DataURL("data:application/opensearchdescription+xml;charset=utf-8," + escape(readBinaryURI(WIKIPEDIA_URI)));
  SearchEnginesCollector.getEngineByXMLURL(dataurl.toString(), "http://en.wikipedia.org/");
  test.waitUntilDone(5 * 1000);
};

exports.testCollectorFoursquare = function (test) {
  SearchEnginesCollector.allowed = true;
  SearchEnginesCollector.on("engine", function onCollectorFoursquare(collected) {
    SearchEnginesCollector.removeListener("engine", onCollectorFoursquare);

    test.assertEqual(collected.name, "foursquare", "FourSquare name is correct");
    test.assertEqual(collected.queryURL, "https://foursquare.com/search?q={searchTerms}&extra=lots", "FourSquare Query URL is correct");
    test.assertEqual(collected.suggestionURL, "", "FourSquare Suggestion URL is empty");
    test.assertEqual(collected.icon, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACs0lEQVQ4jY2PXUjTYRTG/9dBdxm4Mdqs0KAsyKxuJG+8sii6KCGMChYZdOE0pA/Lj0qdotVsISiVouXSSrdppNaa21wfZupWbpn7l+FHQqLM2eb8dbHNj+iiAz/OeZ/nOQdeQTexyKPx/+fhWJDLLzyMTc8DINwfXaDm+zLVf7FSqxkNkmsZ57VrikgJWo8fzYgfjcfP7RE/ZS4/Gk8ATUQfWfZvDM6gNYksLrJ8oMzto8Tt49xLEaWugOzWNE7qbpHz5ifXP81yzTlLsdvHjSEvmS0u/AtBVpaQ55wl45VIwfM0Xn1NxTi0l4aPa8nQHSchv43EwnYybRMo9cOIU3NLi7+8fq4YhhCy+35xtPEpnV/SGZgoxvpNSbNjE5XW9cTn69l2rZuEwg7aHZNLyyM/vZx5PMhZyxjC6Z5JDtfr6Bo+Rv94IRbxFE2DG6m0rmNrXgtbCrq5+uwzgWDo473iNGkN/aSbfqC0TSIcMookP3hHcUcqHcMptH7eSe2HNXR8UZJSbiX1tp0ZXwCA5wPj7NP2cMDoYb/ew0GDiJDS5GZfo4tdmi5O1J0i+0kSWnM+84E5PFNexKk5fgeCVHYOsyHzGdtLOknWuUludJHS5EZIqneyp9bBnjoHCTX9yC+0sUFlIO+pkxlfgOm5AOcbB5Cp9GzONbL7wUAoX+sgqd6JkHjvI9ur+5ap6kVxyYhUpSftrp0j2h6kKgOKiwbiq3qXcjuq+0i8148QX/WeuDtvVxFbaUeW04pEZUSS1YYsp4VYjT3ka8PceUt81XuEOI0deYUNeYUNRbjLb9qQV1iJzmomOqsJeYU15N9cnYnV2BFiyi1I1d1hzGFCs6S0G2mpeRWSyKw2E1NuQZCpzUQVmYgqMrE+3FfyLy2iy9RmBEWZGWmJ6b+QhIm8FWVm/gC+c+W5gWzPJgAAAABJRU5ErkJggg==",
                     "FourSquare icon is correct");

    test.done();
  });

  var dataurl = new DataURL("data:application/opensearchdescription+xml;charset=utf-8," + escape(readBinaryURI(FOURSQUARE_URI)));
  SearchEnginesCollector.getEngineByXMLURL(dataurl.toString(), "http://foursquare.com/");
  test.waitUntilDone(5 * 1000);
};

exports.testCollectorWordpress = function (test) {
  SearchEnginesCollector.allowed = true;
  SearchEnginesCollector.on("engine", function onCollectorWordpress(collected) {
    SearchEnginesCollector.removeListener("engine", onCollectorWordpress);

    test.assertEqual(collected.name, "WordPress.com", "Wordpress name is correct");
    test.assertEqual(collected.queryURL, "http://en.wordpress.com/?s={searchTerms}", "Wordpress Query URL is correct");
    test.assertEqual(collected.suggestionURL, "", "Wordpress Suggestion URL is not empty");
    test.assertEqual(collected.icon, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABu0lEQVQ4jb3TTWvTABjA8X6S4E0RRJjb3Dy4mycv9SAVNi8WZAp+gh08jR0iOMWuHXFMJ4GMyl5qfcER1pqsimmatROWLlBsWjG1TsEWrK75e9Z0YyB6eG7P84PnLSSIKn8ToX8G9MU0RpMWY0mL/hnt8MCpmIZkVJnKOkQWC0QUk8mMw1zeZSAehEJ/FsubdY7fyQQSw7JBZbfNYFzfH3iy7ZG2PcZXS5xfeMuDgotkVDkr5ZCMKgDPyo3eQF9MI217AFxdKSGIKvJmnUarw5FbKiNSjp/dLmnbYyihB4HRpMWlxQLlZovUtocgqlxUTAAiiokgqrx2v3D5sUV0qRgExpIWEcVkKuvQ/rHH0dvrXEtt8fHbdxasGoKoIhlVwrJBdLkH0D+jMZlxOJ3Q6fo+46slJtZspjcqNNsdzs2/4Xpqi5tqmTOzG72HOJd3OTadQXu/y3rlMzfS7xi5n8P3fZ7vNDh57xXzprv/FgbiGo+sGhNrNp29LifuZhFElXz9Ky92Gjws1BiePWCNgqgyGNdRSh8oN1tckPOEZYOntsdL51Og+MBTHkroXFkqEl0u/tbz/3umw8YvjZutq3XUg9MAAAAASUVORK5CYII=",
                     "Wordpress Icon is not correct");

    test.done();
  });

  var dataurl = new DataURL("data:application/opensearchdescription+xml;charset=utf-8," + escape(readBinaryURI(WORDPRESS_URI)));
  SearchEnginesCollector.getEngineByXMLURL(dataurl.toString(), "http://en.wordpress.com/");
  test.waitUntilDone(5 * 1000);
};
