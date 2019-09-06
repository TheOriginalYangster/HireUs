const express = require('express');
const cp = require('child_process');
const util = require('util');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const request = require('request');
const cookieSession = require('cookie-session');
const passport = require('passport');
const verifyUser = require('./Middleware/verifyUser');

require('dotenv').config();
require('./db/config');

function createDocumentMetadata(doc_email, doc_keywords, doc_fileName, cid, doc_contentType) {
  return {
    objects: [
      {
        properties: {
          'enaio:objectTypeId': {
            value: 'resume',
          },
          email: {
            value: doc_email,
          },
          keywords: {
            value: doc_keywords,
          },
        },
        contentStreams: [{
          mimeType: doc_contentType,
          fileName: doc_fileName,
          cid,
        }],
      },
    ],
  };
}

function createImportFormdata(doc_email, doc_keywords, doc_fileName, cid, doc_contentType) {
  const meta = JSON.stringify(createDocumentMetadata(doc_email, doc_keywords, doc_fileName, cid, doc_contentType));
  console.log(meta);
  const formData = {};
  formData.data = {
    value: meta,
    options: {
      contentType: 'application/json',
    },
  };
  formData[cid] = {
    value: fs.createReadStream(doc_fileName),
    options: {
      contentType: doc_contentType,
      filename: doc_fileName,
    },
  };
  return formData;
}

function createRequest(doc_email, doc_keywords, doc_fileName, cid, doc_contentType) {
  const baseUrl = 'https://api.yuuvis.io/';
  return {
    method: 'POST',
    uri: `${baseUrl}dms/objects/`,
    headers: {
      Accept: 'application/json',
      'Ocp-Apim-Subscription-Key': process.env.API_KEY,
    },
    formData: createImportFormdata(doc_email, doc_keywords, doc_fileName, cid, doc_contentType),
  };
}


function executeRequest(request_object) {
  request.post(request_object, (err, httpResponse, body) => {
    if (err) throw err;
    else {
      console.log(httpResponse.statusCode);
      console.log(body);
    }
  });
}

const exec = util.promisify(cp.exec);

const app = express();
app.use(require('morgan')('dev')); // Logs all inbound requests to console
app.use(express.static('dist'));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.COOKIE_SESSION]
}))
require('./auth');
app.use(passport.initialize());
app.use(passport.session());
// app.post('/api/resume', (req, res) => {

// });

app.get('/api/download/resume', (req, res) => {
  res.download('resume.pdf', 'resume.pdf');
});

/*
  TEST POST

  This post request:
  1) gets json resume from client-side
  2) posts the json to yuuvis
  3) returns yuuvis response body

*/
app.post('/api/resume', express.json(), (req, res) => {
  let { email, keywords, resume } = req.body;
  // we need to add a function that writes to resume.json
  resume = JSON.stringify(resume);
  fs.writeFile(path.join(__dirname, '/resume.json'), resume, (err) => {
    if (err) throw err;
    const key = process.env.API_KEY;
    const baseUrl = 'https://api.yuuvis.io/';
    const doc_name = 'resume.json';
    const doc_fileName = path.join(__dirname, '/resume.json');
    const cid = 'cid_63apple';
    const doc_mimeType = 'application/json';
    const requestObject = createRequest(email, keywords, doc_fileName, cid, doc_mimeType);

    executeRequest(requestObject);
  });

  fs.writeFile('resume.json', JSON.stringify(req.body.resume, null, 2), () => {
    exec('resume export resume.pdf  --theme kendall ')
      .then(() => {
        res.download('resume.pdf', 'resume.pdf');
      })
      .catch(() => {
        res.end();
      });
  });
});

app.get('/auth/linkedin',
  passport.authenticate('linkedin', { state: true  }),
  function(req, res){
    // The request will be redirected to LinkedIn for authentication, so this
    // function will not be called.
});

app.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/auth/test', verifyUser, (req, res) => {
  // console.log('Req user: ', req.user);
  res.send(`User authenitcated. Welcome back ${req.user.email}`);
});

app.get('/api/resume/:keywords', (req, res) => {
  const { keywords } = req.params;
  const searches = keywords.split('&');
  let searchString = '';

  for (let i = 0; i < searches.length; i++) {
    searchString += `CONTAINS('${searches[i]}') OR `;
  }
  searchString = searchString.substring(0, searchString.length - 4);
  axios({
    url: 'https://api.yuuvis.io/dms/objects/search',
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': process.env.API_KEY },
    data: {
      query: {
<<<<<<< HEAD
        statement: `SELECT * FROM enaio:object WHERE CONTAINS('${searchString}')`,
=======
        statement: `SELECT * FROM enaio:object WHERE ${searchString}`,
>>>>>>> c932fca7f6e80d825902945afdd62323e6e93f07
      },
    },
  })
    .then((response) => {
      const promises = response.data.objects.map((entry) => {
        const objectId = entry.properties['enaio:objectId'].value;
        const contentType = entry.contentStreams[0].mimeType;
        if (contentType === 'application/pdf') {
          return;
        }
        const headers = { headers: { 'Ocp-Apim-Subscription-Key': process.env.API_KEY } };
        return axios.get(`https://api.yuuvis.io/dms/objects/${objectId}/contents/file`, headers);
      });
      Promise.all(promises)
        .then((results) => {
          const resumes = results.map(result => {
            let resume = result.data;
            console.log(result.request.path);
            let objectId = result.request.path.split('/')[3];
            console.log('objectId:', objectId);
            resume["objectId"] = objectId;
            return resume;
          });
          res.send(resumes);
        })
        .catch((err) => {
          throw (err);
          res.send();
        });
    })
    .catch((error) => {
      console.log('Error: ', error);
      res.send('');
    });
});

app.post('/api/resumeupdate', express.json(), (req, res) => {
  let { email, keywords, resume, objectId } = req.body;
  console.log('Hello!, You are here');
  // we need to add a function that writes to resume.json
  resume = JSON.stringify(resume);
  fs.writeFile(path.join(__dirname, '/resume.json'), resume, (err) => {
    if (err) throw err;
    const key = process.env.API_KEY;
    const baseUrl = 'https://api.yuuvis.io/';
    const doc_name = 'resume.json';
    const doc_fileName = path.join(__dirname, '/resume.json');
    const cid = 'cid_63apple';
    const doc_mimeType = 'application/json';
    const requestObject = createRequest(email, keywords, doc_fileName, cid, doc_mimeType);
    const headers = { headers: { 'Ocp-Apim-Subscription-Key': process.env.API_KEY } };
    executeRequest(requestObject);
    axios.delete(`https://api.yuuvis.io/dms/objects/${objectId}`, headers)
    console.log('Deleted');
    res.send(201);

  });
});
module.exports = app;
