// SPDX-FileCopyrightText: 2021 Anders Rune Jensen
//
// SPDX-License-Identifier: Unlicense

var tape = require('tape')
var fs = require('fs')
var Log = require('../')

tape('basic binary', function (t) {
  var file = '/tmp/dsf-test-basic-binary.log'
  try {
    fs.unlinkSync(file)
  } catch (_) {}
  var db = Log(file, { blockSize: 2 * 1024 })

  var msg1 = Buffer.from('testing')
  var msg2 = Buffer.from('testing2')

  db.append(msg1, function (err, offset1) {
    if (err) throw err
    t.equal(offset1, 0)
    db.append(msg2, function (err, offset2) {
      if (err) throw err
      db.get(offset1, function (err, b) {
        if (err) throw err
        t.equal(b.toString(), msg1.toString())

        db.get(offset2, function (err, b2) {
          if (err) throw err
          t.equal(b2.toString(), msg2.toString())

          db.close(t.end)
        })
      })
    })
  })
})

var json1 = { text: 'testing' }
var json2 = { test: 'testing2' }

tape('basic json', function (t) {
  var file = '/tmp/dsf-test-basic-json.log'
  try {
    fs.unlinkSync(file)
  } catch (_) {}
  var db = Log(file, {
    blockSize: 2 * 1024,
    codec: require('flumecodec/json'),
  })

  db.append(json1, function (err, offset1) {
    if (err) throw err
    t.equal(offset1, 0)
    db.append(json2, function (err, offset2) {
      if (err) throw err
      db.get(offset1, function (err, buf) {
        if (err) throw err
        t.deepEqual(buf, json1)

        db.get(offset2, function (err, buf) {
          if (err) throw err
          t.deepEqual(buf, json2)

          db.close(t.end)
        })
      })
    })
  })
})

tape('basic json re-read', function (t) {
  var file = '/tmp/dsf-test-basic-json.log'
  var db = Log(file, {
    blockSize: 2 * 1024,
    codec: require('flumecodec/json'),
  })

  db.onDrain(() => {
    t.equal(db.since.value, 20)
    db.get(0, function (err, buf) {
      if (err) throw err
      t.deepEqual(buf, json1)

      db.get(20, function (err, buf) {
        if (err) throw err
        t.deepEqual(buf, json2)

        db.close(t.end)
      })
    })
  })
})

tape('basic transaction', function (t) {
  var file = '/tmp/dsf-test-basic-transaction-json.log'
  try {
    fs.unlinkSync(file)
  } catch (_) {}
  var db = Log(file, {
    blockSize: 2 * 1024,
    codec: require('flumecodec/json'),
  })

  db.appendTransaction([json1, json2], function (err, offsets) {
    if (err) throw err
    t.equal(offsets[0], 0)
    db.get(offsets[0], function (err, buf) {
      if (err) throw err
      t.deepEqual(buf, json1)

      db.get(offsets[1], function (err, buf) {
        if (err) throw err
        t.deepEqual(buf, json2)

        db.close(t.end)
      })
    })
  })
})

tape('transaction fail', function (t) {
  var file = '/tmp/dsf-test-transaction-tail-json.log'
  try {
    fs.unlinkSync(file)
  } catch (_) {}
  var db = Log(file, {
    blockSize: 25,
    codec: require('flumecodec/json'),
  })

  db.appendTransaction([json1, json2], function (err, offsets) {
    t.equal(
      err.message,
      'Data to be appended is larger than block size',
      'fails on too much data'
    )
    db.close(t.end)
  })
})
