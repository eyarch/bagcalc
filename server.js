var express = require('express');
var request = require('request');
var fs = require("fs"),
  json;
var app = express();

const BAG_API_ALLOWANCE_URL = "https://brsv2-2fec27dd.ng.bluemix.net/DecisionService/rest/BaseBaggageAllowance/1.0/BaseAllowanceCalc/1.4";
const BAG_API_XS_BAG_RATES_URL = "https://brsv2-2fec27dd.ng.bluemix.net/DecisionService/rest/AdditionalBaggageCost/1.0/AdditionalCostMatrix/1.0";
const BAG_API_WTCPT_RATES_URL = "https://brsv2-2fec27dd.ng.bluemix.net/DecisionService/rest/WeightConcept/1.0/WeightConcept/1.0";


//app.use(express.static(__dirname));
app.use(express.static('public')); //public folder for static content


// /api/airports  - api stub for airports master
app.get('/api/airports', function (req, res) {
  var airportsjson = getJsonFromFile('airports.json');
  airportsjson.sort(function (a, b) {
    return a.Name.localeCompare(b.Name); //Sort by Name
  });
  res.json(airportsjson);
})

// api/bagallowance/USJFK/AEAUH/J  - api stub for baggage allowance
//
app.get('/api/bagallowancestub/:originId/:destnId/:rbdId', function (req, res) {
  var org_country = req.params.originId.substring(0, 2);
  var org_airport = req.params.originId.substring(2, 5);
  var dest_country = req.params.destnId.substring(0, 2);
  var dest_airport = req.params.destnId.substring(2, 5);
  var origin_region = getEyRegion(org_country);
  var destn_region = getEyRegion(dest_country);
  var rbd = req.params.rbdId;
  var bagallowance = {
    "pieces": 3,
    "weight": 23
  };
})

// Make the 
app.get('/api/bagallowance/:originId/:destnId/:rbdId', function (req, res) {
  // read params
  var org_country = req.params.originId.substring(0, 2);
  var org_airport = req.params.originId.substring(2, 5);
  var dest_country = req.params.destnId.substring(0, 2);
  var dest_airport = req.params.destnId.substring(2, 5);
  var rbd = req.params.rbdId;
  var retObj = {};

  //prep request body object
  var bodyObj = {},
    criteria = {};
  criteria.origin = getEyRegion(org_country);
  criteria.destination = getEyRegion(dest_country);
  criteria.fareclass = rbd;
  bodyObj.BaseAllowanceRequest = criteria;
  // {   "BaseAllowanceRequest": {"origin": "AE","destination": "GB","fareclass": "T"} }

  //Call to Bx Rules REST API.
  request({
    url: BAG_API_ALLOWANCE_URL,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": "Basic cmVzQWRtaW46cWhzdjlreWhhNnAy"
    },
    json: true,
    body: bodyObj
  }, function (error, response, body) {
    //console.log(JSON.stringify(body));
    retObj.BaseAllowanceResponse = body.BaseAllowanceResponse; //allowances obj
    retObj.criteria = criteria; // for debugging
    res.json(retObj);
  });

})


// function for getting the ExcessBaggageRates
app.get('/api/xsbagrates/:originId/:destnId/:rbdId', function (req, res) {
  var org_country = req.params.originId.substring(0, 2);
  var dest_country = req.params.destnId.substring(0, 2);

  //prep request body object
  var bodyObj = {},
    criteria = {};
  criteria.origin = org_country;
  criteria.destination = dest_country;
  bodyObj.AddlBaggageCostReq = criteria;

  /** request  -  {  "AddlBaggageCostReq": {    "origin": "AE", "destination": "IR" } } 
      response -   {
              "__DecisionID__": "62cee5f0-1b3e-4426-9940-07264a9f3d330",
          "AddlBaggageCostRes": { "costunit": "USD",      "upgrade25kg": "25","upgrade32kg": "90", "second23kg": "144",  "third23kg": "192", "extra32kg": "234" }
      } 
  **/
  //Call to Bx Rules REST API.
  request({
    url: BAG_API_XS_BAG_RATES_URL,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": "Basic cmVzQWRtaW46cWhzdjlreWhhNnAy"
    },
    json: true,
    body: bodyObj
  }, function (error, response, body) {
    //console.log(JSON.stringify(body));
    res.json(body.AddlBaggageCostRes);
  });

})

// function for getting the ExcessBaggageRates
app.get('/api/wtcptbagrates/:originId/:destnId/:rbdId', function (req, res) {
  var org_country = req.params.originId.substring(0, 2);
  var dest_country = req.params.destnId.substring(0, 2);

  //prep request body object
  var bodyObj = {},
    criteria = {};
  criteria.origin = org_country;
  criteria.destination = dest_country;
  bodyObj.wtconInput = criteria;
  /** request  -  {"wtconInput": {"origin": "KW", "destination": "IN" } } 
      response -   {
    "__DecisionID__": "293aefc4-4a36-48b4-9728-2b971b54b98f0",
    "wtconResponse": {"cost5kg": "70", "cost10kg": "120","cost15kg": "180","cost20kg": "240", "cost25kg": "300", "cost30kg": "360","cost35kg": "420" }}
  **/
  //Call to Bx Rules REST API.
  request({
    url: BAG_API_WTCPT_RATES_URL,
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": "Basic cmVzQWRtaW46cWhzdjlreWhhNnAy"
    },
    json: true,
    body: bodyObj
  }, function (error, response, body) {
    //console.log(JSON.stringify(body));
    res.json(body.wtconResponse);
  });

})


// /api/destinations/:AUH/
app.get('/api/destinations/:destn', function (req, res) {
  var destns = ["AAH", "DOH", "CCJ", "BOM", "COK"];
  res.json(destns);
})

var port = process.env.PORT || 80;
app.listen(port);
console.log('listening on port ' + port);



function readJsonFileSync(filepath, encoding) {
  if (typeof (encoding) == 'undefined') {
    encoding = 'utf8';
  }
  var file = fs.readFileSync(filepath, encoding);
  return JSON.parse(file);
}

function getJsonFromFile(file) {
  var filepath = __dirname + '/' + file;
  return readJsonFileSync(filepath);
}

function getEyRegion(countryCode) {
  const regions = ["AE", "BD", "BH", "BI", "BJ", "BR", "BW", "CA", "CG", "CM", "DJ", "EG", "GB", "ID", "IN", "KE", "KW", "LK", "MA", "MZ", "NA", "NG", "NP", "OM", "PH", "PK", "QA", "RW", "SA", "SD", "SN", "TZ", "UG", "US", "ZM", "ZW"];
  var country = countryCode.toUpperCase();
  return (regions.indexOf(country) > -1) ? country : "ROW";
}