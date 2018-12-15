const Boom = require('boom');
/* hoek is a node utitlities library catered to Hapi needs */
const Hoek = require('hoek');


// Declare internals

const internals = {};


exports.plugin = {
    name: 'basicPlus',
    version: '1.0.0',
    register: function (server) {

        server.auth.scheme('basicPlus', internals.implementation);
    }
};


internals.implementation = function (server, options) {
    
    /* validate that options are right before doing anything */
    Hoek.assert(options, 'Missing basic auth strategy options');
    Hoek.assert(typeof options.validate === 'function', 'options.validate must be a valid function in basic scheme');
    
    /* make a clone of options */
    const settings = Hoek.clone(options);

    const scheme = {
        authenticate: async function (request, h) {
            /* 
                This is the only required method for a scheme
                it does the actual authentication work
                it returns h.authenticated({credentials, artifacts}),
                where credientials is the user data, and artifacts is
                any data that doesn't have to do with the user but does
                for auth (it's optional)
                HOWEVER, on failed auth, return h.unauthenticated(error, [data])
                where data is {credentials, artifcats} now
            */

            const authorization = request.headers.authorization;

            if (!authorization) {
                throw Boom.unauthorized(null, 'Basic', settings.unauthorizedAttributes);
            }

            const parts = authorization.split(/\s+/);

            if (parts[0].toLowerCase() !== 'basic') {
                throw Boom.unauthorized(null, 'Basic', settings.unauthorizedAttributes);
            }

            if (parts.length !== 2) {
                throw Boom.badRequest('Bad HTTP authentication header format', 'Basic');
            }

            const credentialsPart = Buffer.from(parts[1], 'base64').toString();
            const sep = credentialsPart.indexOf(':');
            if (sep === -1) {
                throw Boom.badRequest('Bad header internal syntax', 'Basic');
            }

            const username = credentialsPart.slice(0, sep);
            const password = credentialsPart.slice(sep + 1);

            if (!username &&
                !settings.allowEmptyUsername) {

                throw Boom.unauthorized('HTTP authentication header missing username', 'Basic', settings.unauthorizedAttributes);
            }

            const { isValid, credentials, response } = await settings.validate(request, username, password, h);

            if (response !== undefined) {
                return h.response(response).takeover();
            }

            if (!isValid) {
                return h.unauthenticated(Boom.unauthorized('Bad username or password', 'Basic', settings.unauthorizedAttributes), credentials ? { credentials } : null);
            }

            if (!credentials ||
                typeof credentials !== 'object') {

                throw Boom.badImplementation('Bad credentials object received for Basic auth validation');
            }

            return h.authenticated({ credentials, artifacts: { theThings: "in here are artifacts" } });
        },

        payload: (request, h) => {
            /*
                this is for authenticating the PAYLOAD,
                it only runs when the options property
                'payload' is set to true and you have
                a payload (so this never runs on GET
                requests)
                NOTE: this is not payload VALIDATION,
                that is handled with joi, this is just
                if you want to authenticate the payload
                data
            */
            console.log('hello from the payload authentication');
            return h.continue;
        },
        response: async function (request, h) {
            /* 
                this runs right before a response is sent
                back to the user, it is used for decorating 
                the response with headers
            */
            request.response.headers.test = "new-header"
            console.log('hello from request:', request.response.headers);
            return h.continue;
        },
        options: {
            payload: true /* tells us to run the payload function */
        }
    };

    return scheme;
};