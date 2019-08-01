/* eslint-disable prefer-rest-params */
const crypto = require('crypto');
const fs = require('fs');
const request = require('request');
const Q = require('q');
const debug = require('debug')('sdk');
const p = require('../package');

const config = {
  API_BASE_URL: process.env.SEGVIEW_API_URL,
  MIME_JSON: 'application/json',
  MIME_FORM: 'application/x-www-form-urlencoded',
};

function SegViewError(message, status) {
  this.name = 'SegViewError';
  this.message = message || 'SegView Unknown error';
  this.stack = (new Error()).stack;
  this.status = status || 500;
}

SegViewError.prototype = Object.create(Error.prototype);
SegViewError.prototype.constructor = SegViewError;

const SV = function () {
  if (!process.env.SEGVIEW_API_URL) throw new Error('Missing API URL, configure SEGVIEW_API_URL environment variable');

  let clientId;
  let clientSecret;
  let sandbox = false;


  if (arguments.length > 3 || arguments.length < 1) {
    throw new SegViewError('Invalid arguments. Use CLIENT_ID and CLIENT SECRET', 400);
  }

  if (arguments.length === 2) {
    [clientId, clientSecret] = arguments;
  }

  if (arguments.length === 3) {
    [clientId,, clientSecret] = arguments;
    sandbox = arguments[1] || false;
  }


  // Instance creation
  const sv = {};

  /**
   * Switch or get Sandbox Mode for Basic Checkout
   */
  sv.sandboxMode = function (enable) {
    if (enable !== null && enable !== undefined) {
      sandbox = enable === true;
    }
    return sandbox;
  };


  /**
   Generic resource get
   @param req
   @param params (deprecated)
   @param authenticate = true (deprecated)
   */
  sv.get = function (req) {
    const next = typeof (arguments[arguments.length - 1]) === 'function' ? arguments[arguments.length - 1] : null;
    const deferred = Q.defer();

    // noinspection JSAnnotator
    if (typeof req === 'string') {
      req = {
        uri: req,
        params: arguments[1],
      };
    }

    const localSignature = crypto.createHmac('sha1', clientSecret);
    localSignature.update(process.env.UCERT_API_URL + req.uri);
    const calculatedSignature = `sha1=${localSignature.digest('hex')}`;
    req.headers = {
      'seg-view-api-key': clientId,
      'seg-view-signature': calculatedSignature,
      sandbox,
    };

    req.authenticate = req.authenticate !== false;

    const auth = Q.Promise((resolve, reject) => {
      if (req.authenticate) {
        resolve(sv.getAccessToken());
      } else {
        resolve();
      }
    });

    UCRestClient.get(req).then(
      (data) => {
        debug('data', data);
        next && next(null, data);
        deferred.resolve(data);
      },
      (err) => {
        next && next(err);
        deferred.reject(err);
      },
    );


    return deferred.promise;
  };

  /**
   Generic resource post
   @param req
   @param data (deprecated)
   @param params (deprecated)
   */
  sv.post = function (req) {
    const next = typeof (arguments[arguments.length - 1]) === 'function' ? arguments[arguments.length - 1] : null;
    const deferred = Q.defer();

    if (typeof req === 'string') {
      req = {
        uri: req,
        data: arguments[1],
        params: arguments[2],
      };
    }
    const localSignature = crypto.createHmac('sha1', clientSecret);
    localSignature.update(JSON.stringify(req.body, null, 0));
    const calculatedSignature = `sha1=${localSignature.digest('hex')}`;
    req.headers = {
      'seg-view-api-key': clientId,
      'seg-view-signature': calculatedSignature,
      sandbox,
    };

    req.authenticate = req.authenticate !== false;

    debug('**** COntacting UCRestClient');

    UCRestClient.post(req).then(
      (data) => {
        debug('Success..', data);
        next && next(data);
        deferred.resolve(data);
      },
      (err) => {
        debug('Error..');
        next && next(null, err);
        deferred.reject(err);
      },
    );

    return deferred.promise;
  };


  /**
   generate a OCR request
   @param id
   @param preference
   @return json
   */
  sv.sendPhoto = function (pictures) {
    const next = typeof (arguments[arguments.length - 1]) === 'function' ? arguments[arguments.length - 1] : null;
    if (typeof pictures !== 'object') throw new SegViewError('Wrong parameters, check documentation');
    if (!pictures || !pictures.length || pictures.length === 0) throw new SegViewError('Wrong parameters, missing payload');
    pictures.forEach((picture) => {
      if (!picture.name || !picture.link) throw new SegViewError('Wrong parameters, check documentation');
    });
    debug('Posting recognition');
    debug({ pictures });
    return sv.post(
      {
        uri: '/recognition/',
        body: { pictures },
      },
      next,
    );
  };
  return sv;
};


SV.version = p.version;

// /*************************************************************************/

var UCRestClient = (function () {
  function buildRequest(req) {
    const request = {};

    request.uri = config.API_BASE_URL + req.uri;
    request.method = req.method || 'GET';
    if (req.formData) request.formData = req.formData;

    req.headers || (req.headers = {});

    request.headers = {
      'user-agent': `SegView Node.js SDK v${SV.version}`,
      accept: config.MIME_JSON,
      'content-type': config.MIME_JSON,
    };

    Object.keys(req.headers).map((h) => {
      request.headers[h.toLowerCase()] = req.headers[h];
    });

    if (req.data) {
      if (request.headers['content-type'] === config.MIME_JSON) {
        request.json = req.data;
      } else {
        request.form = req.data;
      }
    }

    if (req.body) {
      if (request.headers['content-type'] === config.MIME_JSON) {
        request.body = JSON.stringify(req.body);
      } else {
        request.form = req.data;
      }
    }

    if (req.params) {
      request.qs = req.params;
    }

    request.strictSSL = true;

    return request;
  }

  function exec(req) {
    const deferred = Q.defer();

    req = buildRequest(req);
    // debug('executing req', req);

    request(req, (error, response, body) => {
      debug('Finished request, informing ');
      debug('Error ', error);
      debug('Body ', body);

      if (error) {
        deferred.reject(new SegViewError(error));
      } else if (response.statusCode < 200 || response.statusCode >= 300) {
        deferred.reject(new SegViewError(body ? body.message || body : 'Unknown', response.statusCode));
      } else {
        debug('No error.. ', response.statusCode);
        try {
          (typeof body === 'string') && (body = JSON.parse(body));
        } catch (e) {
          debug('Catching.. ', e);

          deferred.reject(new SegViewError('Bad response'));
        }
        debug('Resolving.. ', body);

        deferred.resolve({
          status: response.statusCode,
          response: body,
        });
      }
    });

    return deferred.promise;
  }

  // Instance creation
  const restclient = {};

  restclient.get = function (req) {
    // debug('restclient recieved req ', req);
    req.method = 'GET';

    return exec(req);
  };

  restclient.post = function (req) {
    req.method = 'POST';
    debug('Executing post in UCRestClient');
    return exec(req);
  };

  restclient.put = function (req) {
    req.method = 'PUT';

    return exec(req);
  };

  restclient.delete = function (req) {
    req.method = 'DELETE';

    return exec(req);
  };

  return restclient;
}());

module.exports = SV;
module.exports.SegViewError = SegViewError;
