const Bcrypt = require('bcrypt');
const Hapi = require('hapi');

const server = new Hapi.server({
    host: 'localhost',
    port: '3106',
});


/* This is our dummy database */
const users = {
    john: {
        username: 'john',
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',   // 'secret'
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
    console.log('response toolkit:', h.request.auth );

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

    server.route({
        method: 'GET',
        path: '/',
        options: {
            /* here is where we say which strategy */
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
        path: '/plus',
        options: {
            /* here is where we say which strategy */
            auth: 'simplePlus',
            handler: function (request, h) {
                return {
                    title: 'All auth data from h.request.auth',
                    stuff: h.request.auth};
            }
        },
    });

    server.route({
        method: 'POST',
        path: '/plus',
        options: {
            /* here is where we say which strategy */
            auth: 'simplePlus',
            handler: function (request, h) {
                console.log('request.payload:', request.payload);
                return {
                    title: 'All auth data from h.request.auth',
                    stuff: h.request.auth};
            }
        },
    });

    // https://freecontent.manning.com/hapi-js-in-action-diagram/

    server.ext('onPreAuth', (request, h) => {
        console.log('hi from preAuth')
        return h.continue
    });
    server.ext('onPostAuth', (request, h) => {
        console.log('hi from postAuth')
        return h.continue
    });

    await server.start();

    console.log('server running at: ' + server.info.uri);
};

start();