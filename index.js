/*
 * Programmer:    labthe3rd
 * Date:          10/3/2023
 * Desc:          Post request accepts url then adds to a list of short urls. Then returns short url to user for use. I might add a hyperlink or maybe display the list on the home page.
 * Note:          This project was created to earn my Back End Development API cert from freeCodeCamp.com
 *
 */

//we will use dotenv to get our environment variables
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
var bodyParser = require("body-parser");

//Define database and id for url shorteners
let urlDatabase = {};
let currentId = 1;

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

//Adding DNS lookup to verify url
const dns = require("node:dns");

// Basic Configuration
const port = process.env.PORT || 3000;

//Add an environment variable to determine if we are debuging
//When debugging display more console logs.
const is_local = process.env.IS_LOCAL;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

//Adding log to debug request body received
app.use((req, res, next) => {
  console.log("Raw body:", req.rawBody);
  next();
});

//Create function to handle if statement for debug to make code easier to read
function debug(message) {
  if (is_local === "true") {
    console.log(message);
  }
}

//Async function that looks up the DNS record of the url to verify it exists
async function lookupAsync(url) {
  //Return a new promise based on the response
  return new Promise((resolve, reject) => {
    //Lookup the DNS
    dns.lookup(url, (err, address, family) => {
      if (err) {
        //return the error
        reject(err);
      } else {
        //return the ip address and family of the address
        resolve({ address, family });
      }
    });
  });
}

//We will use a regex function to verify that the user input the proper address
function isValidUrl(url) {
  // Note: this regex specifically checks for http:// or https:// and ends with .com
  // Adjust as needed for other URL formats
  const regex = /^https?:\/\/(?:[A-Za-z0-9\-]+\.)+[A-Za-z]{2,3}$/;
  return regex.test(url);
}

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/shorturl", urlencodedParser, async function (req, res) {
  //grab original url from request
  let url = req.body.url;
  debug(req.body.url);

  //Verify the url has a proper format with our function to verify. If not return an error
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  //Use a try statement in case there is an error from the website
  try {
    //We will now make a url object so we can take only the hostname
    let urlObj = new URL(url);
    debug(urlObj);
    //lookup the dns with the urlObj's host name
    const { address, family } = await lookupAsync(urlObj.hostname);
    //create the shhorthand url
    const shortUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/shorturl/${currentId}`;
    //Add url to database based on the index
    urlDatabase[currentId] = url;
    debug("Writing to database: ", urlDatabase[currentId]);
    //Increment the index
    //grab the index before we increment it so we can display it in the json response to pass the test.
    let shortUrlIndex = currentId;
    currentId++;
    //Return json response
    res.json({ original_url: url, short_url: shortUrlIndex });
  } catch (err) {
    //Failed to lookup url
    console.log(err);
    res.status(400).json({ error: "Invalid Hostname" });
  }
});

//On a get request send user to the url in the databse if it exists
app.get("/api/shorturl/:id", function (req, res) {
  //Parse the id of the shorthand url from the id
  const id = parseInt(req.params.id, 10);
  //Grab the original url from the database
  const originalUrl = urlDatabase[id];

  //Check if the url is in the database by verifying originalUrl is not a null object
  if (originalUrl) {
    //Send a redirect response to send the user the original url
    res.redirect(originalUrl);
  } else {
    //Send an error to the user if there is no short url on file for the url provided
    res.status(404).json({ error: "Short URL not found" });
  }
});

//Initialize app with selected port
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
