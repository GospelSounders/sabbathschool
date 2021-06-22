let midiParser  = require('midi-parser-js');
let fs = require('fs')
 
// read a .mid binary (as base64)
fs.readFile('./test.mid', 'base64', function (err,data) {
  // Parse the obtainer base64 string ...
  var midiArray = midiParser.parse(data);
  // done!
  console.log(midiArray);
});