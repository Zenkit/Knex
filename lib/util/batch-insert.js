'use strict';

var Promise = require('bluebird')

function batchInserter(client, tableName, values, limit) {
  return client.transaction(function(trx) {
    var chain   = Promise.resolve(true)
    var results = []

    function makeInsertClosure(offset) {
      return function(result) {
        results.push(result)
        var i = -1, start = offset * limit
        var inserts = limit === 1 ? values[start] : []
        while (limit !== 1 && ++i < limit) {
          var idx = start + i
          if (idx > values.length) break;
          inserts.push(values[idx])
        }
        return trx.insert(inserts).into(tableName)
      }
    }
    var i = -1, totalBatches = Math.ceil(values.length / limit)

    while (++i < totalBatches) {
      chain = chain.then(makeInsertClosure(i))
    }

    return chain.return(results)
  })
}

module.exports = batchInserter