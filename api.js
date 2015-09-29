(function() {
  'use strict';

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

  server.get('/', serveGetRoot);
  server.get('/people', serveGetPeople);
  server.get('/people/:id', serveGetOnePeople);
  server.post('/people', servePostPeople);
  server.put('/people/:id', servePutPeople);
  server.del('/people/:id', serveDeletePeople);

  server.listen(6000, function () {
    console.log('Server listening at port 6000');
  });

  client.on('log', function(level, className, message, furtherInfo) {
    console.log('log event: %s -- %s', level, message);
  });

  client.on('error', function (err) {
    console.error('Error on connecting to cassandra: ', err.message);
    console.log(err.stack);
  });

  /**
   * Implementation
   */

  function serveGetRoot (req, res, cb) {
    console.log('Query on the root');
    res.send({
      msg: 'Hello, welcome to our little cassandra api'
    });

    return cb();
  }

  function serveGetPeople (req, res, cb) {
    console.log('Get query on /people');
    var query = 'SELECT * FROM people';

    return client.execute(query, function (err, response) {
      assert.ifError(err);

      res.send(response.rows);

      return setImmediate(function () {
        return cb();
      });
    });
  }

  function serveGetOnePeople (req, res, cb) {
    console.log('Get query on /people');
    var query = 'SELECT * FROM people WHERE id = ?';
    var data = [req.params.id];
    var opts = {prepare: true};
    return client.execute(query, data, opts, function (err, response) {
      assert.ifError(err);

      res.send(response.rows[0]);

      return setImmediate(function () {
        return cb();
      });
    });
  }

  function servePostPeople (req, res, cb) {
    console.log('Receiving POST query into /people');
    console.log('Params:', req.params);
    var query = 'INSERT INTO people (id, name, city, email) VALUES (?, ?, ?, ?)';
    var data = [
      req.params.id,
      req.params.name,
      req.params.city,
      req.params.email
    ];
    var opts = { prepare: true };

    client.execute(query, data, opts, function (err) {
      assert.ifError(err);

      console.log('Data inserted into cluster');
      res.send({
        msg: 'Inserted with success'
      });

      setImmediate(function () {
        cb();
      });
    });
  }

  function servePutPeople (req, res, cb) {
    var query = 'UPDATE people SET name = ?, city = ?, email = ? WHERE id = ?';
    var data = [
      req.params.name,
      req.params.city,
      req.params.email,
      req.params.id
    ];
    var opts = { prepare: true };

    client.execute(query, data, opts, function (err) {
      assert.ifError(err);

      console.log('Data updated into cluster');
      res.send({
        msg: 'updated with success'
      });

      setImmediate(function () {
        cb();
      });
    });
  }

  function serveDeletePeople (req, res, cb) {
    var query = 'DELETE FROM people WHERE id = ?';
    var data = [req.params.id];
    var opts = { prepare: true };
    client.execute(query, data, opts, function (err) {
      assert.ifError(err);

      console.log('Data removed from cluster');
      res.send({
        msg: 'removed with success'
      });

      setImmediate(function () {
        cb();
      });
    });
  }
})();