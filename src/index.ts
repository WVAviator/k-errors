import dotenv from 'dotenv';
import axios from 'axios';
import { JsonStreamParser } from './JsonStreamParser';

dotenv.config();

// This URL works after using the following command:
// kubectl proxy --port=8080 &
const url = new URL('http://localhost:8080/api/v1/events');

const urlParams = {
  // Watch converts the response to a continuous buffer stream
  watch: 'true',
  // We can include a resourceVersion here to only display logs from a certain point in time.
  // The resourceVersion is returned in every response as data.object.metadata.resourceVersion
  // I think there's also a way to get the most recent resourceVersion from another endpoint
  // resourceVersion: '6047163',
};

// This just converts the urlParams object into a query string
// So, for example, it will look like this: ?watch=true&resourceVersion=6047163
// And append it to the url
// I could have done this with a template string, but this is the recommended way
url.search = new URLSearchParams(urlParams).toString();

const monitorEvents = async () => {
  try {
    // Used axios over fetch because it supports streaming responses
    const response = await axios.get(url.toString(), {
      headers: {
        // This token was returned from kubectl by running the following two commands:
        // kubectl create serviceaccount k-errors
        // kubectl create token k-errors
        Authentication: `Bearer ${process.env.SERVICE_ACCOUNT_TOKEN || ''}`,
        'Content-Type': 'application/json',
      },
      // This tells axios to expect a stream of data as a response
      responseType: 'stream',
    });

    const stream = response.data;

    // This is something built into node - it lets you provide custom logic for
    // handling the stream of data
    // See the JsonStreamParser class in JsonStreamParser.ts for more info
    const parser = new JsonStreamParser();
    stream.pipe(parser);

    // This event is emitted whenever a new JSON object is parsed from the stream
    parser.on('json', (json: any) => {
      // Just log for now, but later we can do our own custom logic
      // Including sending the info to a database and to our frontend
      // The object actually has a ton of info
      // The json.type 'ERROR' is probably what we're looking for in our app
      console.log(json.type + ': ' + json.object.message);
    });
  } catch (error) {
    console.error(error);
  }
};

monitorEvents();
