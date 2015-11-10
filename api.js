(function() {
  'use strict';

  // COISA DO GOD
  var q = require('q');

  var uuid = require('node-uuid');

  var moment = require('moment');

  var restify = require('restify');

  var assert = require('assert');

  var server = restify.createServer();

  var cassandra = require('cassandra-driver');

  var client = new cassandra.Client({
    contactPoints: ['localhost'],
    keyspace: 'api'
  });

  server.use(restify.queryParser());
  server.use(restify.bodyParser());
  server.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  });

  server.get('/', serveGetRoot);
  server.get('/people', serveGetPeople);
  server.get('/people/:id', serveGetOnePeople);
  server.post('/people', servePostPeople);
  server.put('/people/:id', servePutPeople);
  server.del('/people/:id', serveDeletePeople);
  server.get('/updates', serveUpdatesPeople);
  server.post('/updates', servePostUpdatesPeople);

  server.listen(60000, function () {
    console.log('Server listening at port 60000');
  });

  /*client.on('log', function(level, className, message, furtherInfo) {
    console.log('log event: %s -- %s', level, message);
  });*/

  client.on('error', function (err) {
    console.error('Error on connecting to cassandra: ', err.message);
    console.log(err.stack);
  });

  /**
   * Implementation
   */

  function persistUpdate (verb, id) {
    var cql = 'INSERT INTO updates (id, action, changed_id, time) VALUES (?, ?, ?, ?)';
    var data = [uuid.v4(), verb, id, moment().toJSON()];
    return q.ninvoke(client, 'execute', cql, data, { prepare: true })
      .catch(function (err) {
        console.error(err.message);
        console.log(err.stack);
      });
  }

  function runCql(cql, data, params)   {
    return q.ninvoke(client, 'execute', cql, data, { prepare: true })
      .then(q.fcall(function (response) {
        var verb = cql.match(/^(\w+)/)[1];
        if(verb !== 'SELECT' && !/updates/i.test(cql)) {
          return persistUpdate(verb, params.id)
            .then(function () {
              console.log('UHUL');
              return response;
            });
        } else {
          return response;
        }
      }))
      .catch(function (err) {
        console.error('There was an error on the database: ' + err.message);
        console.log(err.stack);
      });
  }

  function serveGetRoot (req, res, cb) {
    console.log('Query on the root');
    res.send({ msg: 'Hello, welcome to our little cassandra api' });
    return cb();
  }

  function serveGetPeople (req, res, cb) {
    console.log('Get query on /people');
    var query = 'SELECT * FROM people';

    return runCql(query)
      .then(function (response) {
        console.log('Got response from cassandra: ', response);
        res.send(response.rows);
      })
      .then(cb);
  }

  function serveGetOnePeople (req, res, cb) {
    console.log('Get query on /people');
    var query = 'SELECT * FROM people WHERE id = ?';
    var data = [req.params.id];

    return runCql(query, data)
      .then(function (response) {
        res.send(response.rows[0]);
      })
      .then(cb);
  }

  function servePostPeople (req, res, cb) {
    console.log('Receiving POST query into /people');
    console.log('Params:', req.params);
    var query = 'INSERT INTO people (id, name, city, email, upd) VALUES (?, ?, ?, ?, ?)';
    var data = [
      req.params.id,
      req.params.name,
      req.params.city,
      req.params.email,
      (req.params.upd || (new Date()).toISOString())
    ];

    runCql(query, data, req.params)
      .then(function (response) {
        console.log('Data inserted into cluster');
        res.send({ msg: 'Inserted with success' });
      })
      .then(cb);
  }

  function servePutPeople (req, res, cb) {
    var query = 'UPDATE people SET name = ?, city = ?, email = ?, upd = ? WHERE id = ?';
    var data = [
      req.params.name,
      req.params.city,
      req.params.email,
      (req.params.upd || (new Date()).toISOString()),
      req.params.id
    ];

    runCql(query, data, req.params)
      .then(function (response) {
        console.log('Data updated into cluster');
        res.send({ msg: 'updated with success' });
      })
      .then(cb);
  }

  function serveDeletePeople (req, res, cb) {
    var query = 'DELETE FROM people WHERE id = ?';
    var data = [req.params.id];

    runCql(query, data, req.params)
      .then(function (response) {
        console.log('Data removed from cluster');
        res.send({ msg: 'removed with success' });
      })
      .then(cb);
  }

  function serveUpdatesPeople (req, res, cb) {
    var query = 'SELECT * FROM updates WHERE time > ? ALLOW FILTERING';
    console.log(req.query);
    var data = [moment(req.query.last).toJSON()];

    runCql(query, data)
      .then(function (response) {
        console.log('Being requested for updates');
        res.send(response.rows);
      })
      .then(cb);
  }

  function buildCql (verb, args) {
    var cql, data;
    switch(verb) {
      case 'UPDATE':
        cql = verb + ' people SET name = ?, email = ?, city = ? WHERE id = ?';
        data = [args.name, args.email, args.city, args.id];
        break;
      case 'INSERT':
        cql = verb + ' INTO people SET id = ?, name = ?, email = ?, city = ?';
        data = [args.id, args.email, args.city, args.name];
        break;
      case 'DELETE':
        cql = verb + ' FROM people WHERE id = ?';
        data = [args.id];
        break;
      default:
        throw new Error('Invalid verb: ' + verb);
    }

    return runCql(cql, data);
  }

  function insertInLog (diff) {
    var cql = 'INSERT INTO updates (id, action, changed_id, time) VALUES (?, ?, ?, ?)';
    var data = [diff.id, diff.action, diff.changed_id, diff.time];
    return runCql(cql, data)
      .then(q.fcall(() => diff));
  }

  function servePostUpdatesPeople (req, res, cb) {
    var buffer = []; // Buffer de promises
    var diff = req.params.diff;
    var data = req.params.rows;
    var prom;

    console.log('Receiving updates...');
    console.log(diff, data);

    var sortFunc = function (a, b) {
      return moment(a.time).diff(moment(b.time));
    };

    diff.sort(sortFunc);

    for (var i = 0; i < diff.length; i++) {
      console.log('Iterating...');
      prom = insertInLog(diff[i])
        .then(function (diff) {
          return buildCql(diff.action, data[String(diff.id)]);
        });
      buffer.push(prom);
    }

    q.all(buffer)
      .then(function () {
        res.send({ msg: 'All updates where sincronized with success' });
        return cb();
      })
      .catch(function (err) {
        console.error(err.message);
        console.log(err.stack);
        cb();
      });
  }
})();