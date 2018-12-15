const Bcrypt = require('bcrypt');
const Hapi = require('hapi');

const server = new Hapi.server({
    host: 'localhost',
    port: '3106',
});


/* This is our dummy DB */
const users = {
    john: {
        username: 'john',
        /* decodes to 'secret' */
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',
        name: 'John Doe',
        id: '2133d32a'
    }
};

/*
    Required validate function that needs to be passed in
    to hapi-auth-basic
*/
const validate = async (request, username, password, h) => {

    const user = users[username];
    if (!user) {
        /*
            for hapi-auth-basic (HAB), you must return an
            object with isValid prop,
            for all hapi auth plugins, they will need
            a credentials property to be returned from
            their inner authenticate functions
            (HAB calls validate inside its authenticate)
        */
        return { credentials: null, isValid: false};
    }

    /* see how we are unauthenticated at this point */
    console.log('we are not yet authenticated in the validate function', h.request.auth );

    const isValid = await Bcrypt.compare(password, user.password);
    const credentials = { id: user.id, name: user.name };

    return { credentials, isValid };
};

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

start();