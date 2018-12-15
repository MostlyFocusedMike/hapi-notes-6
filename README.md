--------------------------------------------------------------------------------------------------------------------
# SECTION 6: AUTHENTICATION
- [my github for this section](https://github.com/MostlyFocusedMike/hapi-notes-6)
- primary sources
    - https://hapijs.com/tutorials/auth
    - https://github.com/hapijs/hapi-auth-basic
    - https://futurestud.io/tutorials/hapi-basic-authentication-with-username-and-password
    - https://github.com/kelektiv/node.bcrypt.js

--------------------------------------------------------------------------------------------------------------------
## Basic auth overview
**this section has a lot more conceptual stuff going on, so without any code, here is the overall idea of what Hapi is doing**  


- Certain routes can require authentication before being viewed, i.e. users must be signed in and allowed to view this content 

- like a lot of frameworks, this authorization data is stored in the request's headers, under the authorization key, or in cookies

- The way hapi does auth is with plugins that use *strategies* and *schemes*. 

- The plugin will provide the scheme, and you will use that scheme to create a strategy by giving it options. You will use that strategy to authenticate users for your routes

    - The scheme will have a lot of built in functionality, things like checking to make sure there even is a username and password, and setting up built in error handling

    - **a *strategy* is just the name you give a *scheme* after configuring it with *options***

- most auth plugins will require certain things in the options to even work, for instance [hapi-auth-basic](https://github.com/hapijs/hapi-auth-basic/blob/master/lib/index.js) requires you to pass in a validation function specifically called 'validate'

on a slightly more nuts an bolts level, here is what happens with hapi:

1. register your auth plugin with your server 
 - inside the plugin, it will register its scheme to your server with **server.auth.scheme()**
- set your strategy on your server by passing in options to your schema with **server.auth.strategy()**
- on each route under options, name the auth strategy that must pass for the route to be accessed
- on every request, hapi will first check if it passes the given auth strategy
    - you can specify a strategy on a route, specify more than one, leave it off and instead use a default, or specifically state that no authentication should be done
    - you can also tell it to authenticate the payload as well and change the response headers
- once everything passes, hapi will finally send your response to the user 





--------------------------------------------------------------------------------------------------------------------
## Auth via headers (hapi-auth-basic)
- the simplest possible way to authenticate is through the headers using [hapi-auth-basic](https://github.com/hapijs/hapi-auth-basic) 
- We'll use this for this section since it is simple and easy to read
- A much better way to set auth is through session cookies, which we will cover in the next section

### Code  Overview 
- here is a helpful snippet straight from the [hapi docs](https://hapijs.com/tutorials/auth?lang=en_US) that uses hapi-auth-basic:
 
```
const Bcrypt = require('bcrypt');
const Hapi = require('hapi');

/* our fake db */
const users = {
    john: {
        username: 'john',
        /* this translates to 'secret' */
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',  
        name: 'John Doe',
        id: '2133d32a'
    }
};


/*
    Required validate function that needs to be passed in
    to hapi-auth-basic
*/
const validate = async (request, username, password) => {
    const user = users[username];
    if (!user) return { credentials: null, isValid: false };

    const isValid = await Bcrypt.compare(password, user.password);
    const credentials = { id: user.id, name: user.name };
    return { isValid, credentials };
};

const start = async () => {

    const server = Hapi.server({ port: 3106 });
    await server.register(require('hapi-auth-basic'));
    server.auth.strategy('simple', 'basic', { validate });

    server.route({
        method: 'GET',
        path: '/',
        options: {
            auth: 'simple'
        },
        handler: function (request, h) {

            return 'welcome';
        }
    });

    await server.start();

    console.log('server running at: ' + server.info.uri);
};

start();
```
- Copy this into a js file and run node on it (or use my [github](https://github.com/MostlyFocusedMike/hapi-notes-6), it's already set up)
- Since this requires headers to run, chrome will spit a prompt box asking for username and password in order to get the headers. This is odd, and another reason why sites don't use an auth strategy that relies only on headers like this


- now let's break down all that code: 




-----------------------------------------------------------------------------------------------------------------------------------
## Validation function
- For most auth plugins, you'll have to pass something into the options like a function or key value,  and those may have to return certain values 
- hapi-auth-basic only requires a user defined validation function called 'validate', which we get to define
    - that function must return 'isValid' as true or false, and an object called 'credentials' that contains the user's info
- In this case, all we're doing is checking whether or not a given user is valid by using [Bcrypt](https://www.npmjs.com/package/bcrypt-nodejs) to decode the password and check for a match
- hapi-auth-basic has to return an object with an isValid property, since that is what the scheme's **authenticate** function will go off of when telling hapi whether or not the user is authenticated or not 

```
const validate = async (request, username, password) => {
    const user = users[username];
    if (!user) return { credentials: null, isValid: false };

    const isValid = await Bcrypt.compare(password, user.password);
    const credentials = { id: user.id, name: user.name };
    return { isValid, credentials };
};
```
---------------------------------------------------------------------------------------------------------------------------------
## Setting your strategy 
- After we register the hapi auth-plugin (which registers the scheme), we set the strategy
- setting the strategy uses **server.auth.strategy(strategy-name, schema-name, [options])**
- for hapi-auth-basic, the only required key for **options** is a function called 'validate'


```
// plugin
await server.register(require('hapi-auth-basic'));

// register strategy
server.auth.strategy('simple', 'basic', { validate });
```
- you can also set a default strategy for all routes:
 
```
await server.register(require('hapi-auth-basic'));
server.auth.strategy('simple', 'basic', { validate });

/* now use it as the dafult */
server.auth.default('simple');
```
- you pass **.default()** the strategy name as a string, or you can pass it as an **auth options object** (see below)
- any route registered before **.default()** is run will not have the default set, so set it at the top if you want all your routes covered 




----------------------------------------------------------------------------------------------------------------------------------
## Options (the auth options object in our routes)
- finally, we have to tell the route which strategy to use and any additional configs
- here are some ways you can do that 

```
// no auth strategy 
options: {
    auth: false
}

// #1 a single name
options: {
    auth: 'name'
}
// #2 as an object
options: {
    auth: {
        strategy: 'name'
        mode: 'required'
    }
}

// #3 multiple strategies
options: {
    auth: {
        strategies: ['name', 'other-name']
        mode: 'required'
    } 
}
```
- when naming more than one, they will be tried in order 
- when auth is set to false there will be no authentication provided for that route
- in addition to the auth strategy, you can also pass several other options to auth: 
    - **mode (optional)** options are:
        -  required: the user must have valid authentication
        - optional: authentication's optional, but if present, it must be valid (so no auth will pass, but wrong auth will fail)
        - try: authentication is optional, and wrong authentication will pass, this is the main difference to the 'optional' setting 
    - **payload** (optional):
        - false: the payload is NOT to be authenticated
        - true or 'required': the payload WILL be authenticated 
        - optional: if there is payload authentication data given from the client, it will be used, otherwise the payload will not be authenticated 
        - note that not all auth plugins support payload validation

-----------------------------------------------------------------------------------------------------------------------------------
## Seeing strategies in context

- you can test this my opening an incognito browser and going to each route, and when you want to restart, just close the incognito window. Google seems to remember these auth headers for the duration of the window (not tab) being opened 
- you can also use postman, as long as you set each individual request with basic auth set
- finally, here is what our routes look like in the github, notice how each one differs:

```
const start = async () => {

    await server.register([
        /* our schemes get registered when the plugins are registered */
        require('hapi-auth-basic'),
        require('./hapi-auth-basic-plus')
    ]);
                       /* strategy, scheme, options */
    server.auth.strategy('simple', 'basic', { validate });
    server.auth.strategy('simplePlus', 'basicPlus', { validate });
    /* you can set a default auth strategy */
    server.auth.default('simplePlus');
    
    server.route({
        method: 'GET',
        path: '/',
        options: {
            /* 
                here is where we say which strategy 
                it will override the simplePlus default
            */
            auth: 'simple',
            handler: function (request, h) {
                return {
                    title: 'All auth data from h.request.auth',
                    stuff: h.request.auth};
            }
        },
    });

    server.route({
        method: 'GET',
        path: '/no-auth',
        options: {
            /* 
                here is where we say no auth strategy
                it will override the simplePlus default
            */
            auth: false,
            handler: function (request, h) {
                return {
                    title: 'All the auth data is empty now',
                    stuff: h.request.auth};
            }
        },
    });

    server.route({
        method: 'GET',
        path: '/plus',
        options: {
            /*
                here is how we can use multiple strategies 
            */
            auth: {
                strategies: ['simplePlus', 'simple']
            },
            handler: function (request, h) {
                return {
                    title: 'All auth data from h.request.auth',
                    hRequestAuthStuff: h.request.auth};
            }
        },
    });

    server.route({
        method: 'POST',
        path: '/plus',
        options: {
            /* 
                Notice no auth is given, but because of our default 
                it will still run simplePlus
            */
            handler: function (request, h) {
                console.log("Hello from the POST route handler: ", request.payload)
                return {
                    title: 'All auth data from h.request.auth, including the artifacts now',
                    hRequestAuthStuff: h.request.auth};
            }
        },
    });

    /* 
        These are lifecycle methods, we will talk more about them
        later, but for now just use them to see at what point 
        things get run with auth
        https://freecontent.manning.com/hapi-js-in-action-diagram/ 
    */

    server.ext('onPreAuth', (request, h) => {
        console.log('hello from preAuth')
        return h.continue
    });
    server.ext('onPostAuth', (request, h) => {
        console.log('hello from postAuth')
        return h.continue
    });
    await server.start();

    console.log('server running at: ' + server.info.uri);
};
```

- notice that there are two strategies registered, before moving on to the next section, let's look a bit at how the schemes themselves work




-----------------------------------------------------------------------------------------------------------------------------------
# How Schemes work with hapi-auth-basic-plus

- schemes at their most basic level are just methods that look like:      
 **function (server, options)**
- the method must return an object with the key of **authenticate**, but it can also have the keys **payload**, **response**, and **options**
- I've taken [hapi-auth-basic](https://github.com/hapijs/hapi-auth-basic) and modified it a bit to add all the parts we'll talk about, but let's look at it in full, and then break down each function
- here is the file below, but really, try reading [my GitHub](https://github.com/MostlyFocusedMike/hapi-notes-6/blob/master/hapi-auth-basic-plus.js) for full context, it's much easier to read 

```
const Boom = require('boom');
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

    Hoek.assert(options, 'Missing basic auth strategy options');
    Hoek.assert(typeof options.validate === 'function', 'options.validate must be a valid function in basic scheme');

    const settings = Hoek.clone(options);

    const scheme = {
        authenticate: async function (request, h) {
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
            console.log('hello from the payload authentication');
            return h.continue;
        },
        response: async function (request, h) {
            request.response.headers.test = "new-header"
            console.log('hello from request:', request.response.headers);
            return h.continue;
        },
        options: {
            payload: true /* tells us to run the payload function */
        }

    return scheme;
};
```
--------------------------------------------------------------------------------------------------------------------------------
## Export setup 
- the most important part is setting up the export. After we load our required packages, [hoek](https://github.com/hapijs/hoek) which is a node utilities package for hapi, and hapi itself, we set up our export: 

```
const internals = {};

exports.plugin = {
    name: 'basicPlus',
    version: '1.0.0',
    register: function (server) {

        server.auth.scheme('basicPlus', internals.implementation);
    }
};

internals.implementation = function (server, options) {
// the scheme is in here
```
- Like any plugin, we give it a name and version, and then a register function
- all the register function does is run server.auth.scheme(), with the actual scheme being contained in an internals.implementation function
    - this is a common structure for hapi auth plugins, it keeps larger projects neat 




-----------------------------------------------------------------------------------------------------------------------------------
## Scheme setup
- in broad strokes here is what our scheme looks like: 

```
internals.implementation = function (server, options) {

    /* 
        validate that options are right before doing anything,
        if they aren't we will throw an error with the given msg
    */
    Hoek.assert(options, 'Missing basic auth strategy options');
    Hoek.assert(typeof options.validate === 'function', 'options.validate must be a valid function in basic scheme');
    const settings = Hoek.clone(options);


    /* our actual scheme */
    const scheme = {

        /* authentication function */
        authenticate: async function (request, h) {
            /* authenticatation logic */
            if (/* bad auth */) {
                return h.unauthenticated(err, data);
            }
            return h.authenticated({ credentials, artifacts: { theThings: "in here are artifacts" } });
        },
        

        /* payload authentication function */
        payload: async function(request, h) {
            /* logic */
            return h.continue;
        },

        /* response headers modifier function */
        response: async function (request, h) {
            /* logic */
            return h.continue;
        },

        /* should we authenticate payload or not */
        options: {
            payload: true  us to run the payload function */
        }
    return scheme;
}

```
- so schemes have 3 main functions, and then a an options object, the only required thing is the authenticate function
- let's talk about each part a little: 

----------------------------------------------------------------------------------------------------------------------------------
## Scheme.authenticate(request, h) 
- takes the request and h toolkit
- it MUST return either **h.authenticated()** or **h.unauthenticated()**
    - **h.authenticated({credentials, [artifacts] })** (required)
        - just pass in an *object* with the keys of **credentials** and if you want **artifacts**
        - **credentials** is all the user data used for auth, like id and username 
        - **artifacts** are optional data to pass back that is not user data, but does relate to auth
        - these are both accessible later in the route handler under **request.auth**
    - **h.unauthenticated(err, [data])** (required)
        - **err** is the auth error
        - **data** optional, and it's the user data that failed auth
   
----------------------------------------------------------------------------------------------------------------------------------
## Scheme.payload(request, h), also need options 
- takes the request and h toolkit
- this function just takes care of payload authentication
- if authentication is good, return h.continue, if it fails, just throw an error ([boom](https://github.com/hapijs/boom) is what hapi recommends using)
- you only run the payload authentication when the sheme's option's object has the key of **payload** set to true
```
        payload: (request, h) => {
            console.log('hello from the payload authentication');
            return h.continue;
        },
        options: {
            payload: true;
        }
```




----------------------------------------------------------------------------------------------------------------------------------
## Scheme.response(request, h) 
- takes the request and h toolkit
- this is used to decorate the response object with headers
- it should throw an error or return h.continue, like payload does 
```
        response: async function (request, h) {
            request.response.headers.test = "new-header"
            console.log('hello from request:', request.response.headers);
            return h.continue;
        },
```