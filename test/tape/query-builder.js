'use strict';

var inherits     = require('inherits');
var tape         = require('tape')
var QueryBuilder = require('../../lib/query/builder')
var Client       = require('../../lib/client')
var Promise      = require('bluebird')
var MockClient   = function() {
  Client.apply(this, arguments)
}
inherits(MockClient, Client)

MockClient.prototype.query = function(connection, obj) {
  this.emit('query', obj)
  return Promise.resolve(1)
}
MockClient.prototype.acquireConnection = function() {
  return Promise.resolve({stub: true})
}
MockClient.prototype.releaseConnection = function() {
  return Promise.resolve()
}
MockClient.prototype.processResponse = function(val) {
  return val
}

tape('accumulates multiple update calls #647', function(t) {
  t.plan(1)
  var qb = new QueryBuilder({})
  qb.update('a', 1).update('b', 2)
  t.deepEqual(qb._single.update, {a: 1, b: 2})
})

tape('allows for object syntax in join', function(t) {
  t.plan(1)
  var qb = new QueryBuilder(new MockClient())
  var sql = qb.table('users').innerJoin('accounts', {
    'accounts.id': 'users.account_id',
    'accounts.owner_id': 'users.id'
  }).toSQL('join')
  t.equal(sql.sql, 
    'inner join "accounts" on "accounts"."id" = "users"."account_id" and "accounts"."owner_id" = "users"."id"')
})

tape('allows for batch inserts', function(t) {
  t.plan(1)
  var qb = new QueryBuilder(new MockClient())
  var queries = []
  var expected = ['BEGIN;', 'insert into "items" ("a") values (?), (?)', 'insert into "items" ("a") values (?)', 'COMMIT;']
  qb.batchInsert('items', [{a: 1}, {a: 2}, {a: 1}], 2)
    .on('query', function(obj) {
      queries.push(obj.sql || obj)
    })
    .finally(function() {
      t.deepEqual(queries, expected)
    })
})
