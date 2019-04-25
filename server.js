// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());
// API route to list rows from Airtable:

const connection = require('./database-connection');

app.get("/api/lookup/:id", function(request, response) {
  console.log("Handling unique ID lookup request");
  //recJ63c5IuXhzTWjP
  //recByJTb08ThoozXs
  connection.handleIDLookupRequest(request, response);
});

app.get("/api/food", function(request, response) {
  console.log("Handling food choice lookup request");
  connection.handleFoodLookupRequest(request, response);
});

app.post("/api/update", function(request, response) {
	console.log("handling updating records");
	connection.handleRecordUpdate(request, response);
});

app.get("/api*", function(request, response) {
  
  const responseObject = {
    Error : "Invalid path"
  }
  
  response.status(400).end(JSON.stringify(responseObject));
});


// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

