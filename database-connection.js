// database-connection.js
// Where we connect to Airtable and handle requests from server.js

const Airtable = require('airtable');

const base = new Airtable({
  apiKey: 'key0wqwI5JvTzZjwZ',
}).base('app6sp3SDfmbo5d2L');

// ^ Configure Airtable using values in 🗝.env

const viewName = 'Grid view';

const tableAI = 'Guest List';
const tableFood = 'Food Choice';

//const tableProperties = 'Science Fiction Properties';

// ^ These are the tables we'll be reading from Airtable

const Bottleneck = require('bottleneck');
const rateLimiter = new Bottleneck({
  minTime: 1050 / 5
}) // ~5 requests per second

// ^ Bottleneck, instanced as rateLimiter, allows us to conform to rate limits specified by Airtable's API

//    Failure to comply with the Airtable rate limit locks down its API for 30 seconds:
//    https://airtable.com/api

const cache = require('./caching');

// ^ caching.js reads and writes local files 

function sendResultWithResponse(result, response) {
  response.status(200).end(JSON.stringify(result));
}

function cachePathForRequest(request) {
  return '.newcache' + request.path + '.json';  
}

module.exports = {

  handleRecordUpdate: function(request, response) {
    var data = request.body;
    console.log(data);

    data.forEach((updateRecord) => {
      console.log({updateRecord});
      rateLimiter.wrap(base(tableAI).update(updateRecord.id, {
        "RSVP": updateRecord.rsvp,
        "Food Choice": updateRecord.foodChoice,
      }, function(err, record) {
        if(err) { console.error(err); return;}
      }));
    });
    
    var result = 'Success';
    sendResultWithResponse(result, response);
  },

  handleFoodLookupRequest: function(request, response) {
      var cachePath = cachePathForRequest(request);
      var results = [];
      var cachedResult = cache.readCacheWithPath(cachePath);

      if(cachedResult != null) {
        console.log("Cache hit. Returning cached result for " + request.path);
        sendResultWithResponse(cachedResult, response);
      } else {
        console.log("Food lookup");
        console.log("Cache miss. Loading from Airtable for " + request.path);

        rateLimiter.wrap(base(tableFood).select({
          view: viewName,
        }).eachPage(function page(records, fetchNextPage) {
            records.forEach(function(record) {
              var result = {
                foodChoice: record.get("Food Choice")
              };

              results.push(result);              
            });

            fetchNextPage();

        }, function done(error) {
            if(error) {
             sendResultWithResponse([], response);
            } else {
              cache.writeCacheWithPath(cachePath, results);
              console.log("Returning records");
              sendResultWithResponse(results, response);
            }
        }));
      }
  },

  handleIDLookupRequest: function(request, response) {
    
    var cachePath = cachePathForRequest(request);
    var results = [];
    var cachedResult = cache.readCacheWithPath(cachePath);

    if (cachedResult != null) {
      console.log("Cache hit. Returning cached result for " + request.path);
      sendResultWithResponse(cachedResult, response);
    } else {
      console.log("id: " + request.params.id)
      console.log("Cache miss. Loading from Airtable for " + request.path);

      rateLimiter.wrap(base(tableAI).select({
        view: viewName,
        filterByFormula: `SEARCH("${request.params.id}", {ID})`,
        pageSize: 100 //This page size is unnecessarily small, for demonstration purposes.
                    //You should probably use the default of 100 in your own code.
      }).eachPage(function page(records, fetchNextPage) {
                

          records.forEach(function(record) {
            
            var result = {
              party: record.get('Party'),
              guest: record.get('Guest'),
              partySize: record.get('Party Size'),
              rsvp: record.get('RSVP'),
	            foodChoice: record.get('Food Choice'),
	            id: record.id
            }

            results.push(result);

          });

        
          fetchNextPage();

      }, function done(error) {
          if(error) {
            sendResultWithResponse([], response);
          } else {
            cache.writeCacheWithPath(cachePath, results);
            console.log("Returning records");
            sendResultWithResponse(results, response);
          }
      }));

    }
  }

}
