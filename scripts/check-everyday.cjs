var fs = require('fs');
var path = require('path');
var audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'theme-audit.json'), 'utf8'));
var everyday = audit.filter(function(a) { return a.newTheme === 'everyday'; });

var wordsDir = path.join(__dirname, '..', 'src', 'domains', 'spelling', 'words');
var tiers = ['tier1','tier2','tier3','tier4','tier5','tier5-scripps','tier5-state'];
var allContent = '';
tiers.forEach(function(t) {
  allContent += fs.readFileSync(path.join(wordsDir, t + '.ts'), 'utf8');
});

everyday.forEach(function(a) {
  var escaped = a.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp("word:\\s*'" + escaped + "',\\s*\\n\\s*definition:\\s*'([^']*)");
  var m = allContent.match(re);
  if (m) console.log(a.word + ' [was:' + a.oldTheme + ']: ' + m[1]);
  else console.log(a.word + ': [def not found]');
});
