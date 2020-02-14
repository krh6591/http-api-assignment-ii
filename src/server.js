const http = require('http');
const fs = require('fs');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Load the html and css fles
const indexHTML = fs.readFileSync(`${__dirname}/../client/client.html`);
const indexCSS = fs.readFileSync(`${__dirname}/../client/style.css`);

// Pre-built object for 404 responses
const notFoundObj = {
  message: 'The page you are looking for was not found.',
  id: 'notFound',
};

// Array of all known users
const users = [];

// Helper function to sift through the users array
function userExists(name) {
  for (let i = 0; i < users.length; ++i) {
    if (users[i].name === name) { return true; }
  }
  return false;
}

// Compressed helper function for sending responses
function sendResponse(request, response, statusCode, contentType, data) {
  // Send data only if data is to be sent
  if (request.method !== 'HEAD' && contentType && data) {
    response.writeHead(statusCode, { 'Content-Type': contentType });
    response.write(data);
  } else {
    response.writeHead(statusCode);
  }
  response.end();
}

// Handle POST requests to create users
function addUser(request, response) {
  const body = [];

  // Call it a bad request if it errors out
  request.on('error', () => {
    response.statusCode = 400;
    response.end();
  });

  // Collect the data
  request.on('data', (chunk) => {
    body.push(chunk);
  });

  // Handle the data once the stream finishes
  request.on('end', () => {
    // Put the data together
    const data = JSON.parse(Buffer.concat(body).toString());

    if (!data.name || !data.age) {
      sendResponse(request, response, 400, 'application/json', JSON.stringify({
        message: 'Name and age are both required.',
        id: 'missingParams',
      }));
    }

    // Send a 204 if the user already exists; otherwise add it to the list
    if (userExists(data.name)) {
      sendResponse(request, response, 204, null, null);
    } else {
      users.push({ name: data.name, age: data.age });
      sendResponse(request, response, 201, 'application/json', JSON.stringify({
        message: 'Created Successfully',
      }));
    }
  });
}

function onRequest(request, response) {
  const requestSplit = request.url.split('?');
  const reqURL = requestSplit[0];
  const reqParams = {};

  // Extract query params
  if (requestSplit.length > 1) {
    const params = requestSplit[1].split('&');

    for (let i = 0; i < params.length; ++i) {
      const paramSplit = params[i].split('=');
      if (paramSplit.length === 2) {
        // Somehow this is considered preferable to doing it inline by airbnb
        const p0 = paramSplit[0];
        const p1 = paramSplit[1];
        reqParams[p0] = p1;
      }
    }
  }

  // Inline the functionality into the switch (sendResponse does all the heavy lifting)
  switch (reqURL) {
    case '/':
      sendResponse(request, response, 200, 'text/html', indexHTML);
      break;
    case '/style.css':
      sendResponse(request, response, 200, 'text/css', indexCSS);
      break;
    case '/addUser':
      addUser(request, response);
      break;
    case '/getUsers':
      sendResponse(request, response, 200, 'application/json', JSON.stringify(users));
      break;
    // If all /notReal does is return 404, and the default already does that,
    // The best solution is no solution at all
    default:
      sendResponse(request, response, 404, 'application/json', JSON.stringify(notFoundObj));
      break;
  }
}

http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1:${port}`);
