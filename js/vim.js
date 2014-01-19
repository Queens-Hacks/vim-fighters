var _ = require('lodash');
var XRegExp = require('xregexp').XRegExp;

Buffer = function(options) {
  _.extend(this, options);
};
var esc = function (c) {
  if (c === ' ')
    return '&nbsp;';
  if (c === '<')
    return '&lt;';
  if (c === '>')
    return '&gt;';
  if (c === '&')
    return '&amp;';
  return c;
}

var pad = function(num) {
  var s = num.toString(10);
  var len = s.length;
  for (var i=0; i<(3 - len); i++) {
    s = '&nbsp;' + s;
  }

  return s;
}

Buffer.prototype = {
  mode: 'normal',
  text: ['This is the song that never ends...',
        'It goes on & on my friends',
        'Some people started singing it not knowing what it was, and they will keep on singing it forever just because',
        'see <1>'],
  cursor: [3,80],

  render: function(width) {
    var out = '';
    var col = 0;
    var line = 1;

    for (var line=0; line<this.text.length; line++) {
      var text = this.text[line];

      // Display the line number!
      col = 4;
      out += '<span class="linenum">' + pad(line + 1) + '&nbsp;</span>';

      for (var i=0; i<text.length; i++) {
        // Get and escape the character
        var c = text.charAt(i);
        c = esc(c);

        // Wrap lines
        if (col === 80) {
          out += '<br /><span class="linenum">&nbsp;&nbsp;&nbsp;&nbsp;</span>';
          col = 4;
        }

        if (this.cursor[1] === i && this.cursor[0] === line)
          out += '<span class="cursor">' + c + '</span>';
        else
          out += c;
        col++;
      }

      if (this.cursor[0] === line && this.cursor[1] >= text.length) {
        out += '<span class="cursor">&nbsp;</span>';
      }

      // Next line!
      out += '<br />';
    }

    return out;
  }

};
var b = new Buffer;

document.body.innerHTML = b.render(80);
console.log(b.render(80));

Mapping = function(re, action, modifiers) {
  this.re = re;
  this.action = action;
  this.modifiers = modifiers;
};

Vim = function(cwidth, cheight) {
  this.cwidth = cwidth;
  this.cheight = cheight;
};

Vim.prototype = {
  mode: 'normal',
  nmode_map: [],
  imode_map: [],

  command_log: '',

  nmode_remap: function(re, action, modifiers) {
    modifiers = modifiers || [];

    if (typeof re === 'string')
      re = new RegExp(re);

    this.nmode_map.unshift(new Mapping(re, action, modifiers));
  },

  imode_remap: function(re, action, modifiers) {
    modifiers = modifiers || [];

    if (typeof re === 'string')
      re = new RegExp(re);

    this.imode_map.unshift(new Mapping(re, action, modifiers));
  },

  command_check: function() {
    var map = (this.mode === 'normal') ? this.nmode_map : this.imode_map;
    for (var i=0; i<map.length; i++) {
      var match = this.command_log.match(map[i].re);

      if (match) {
        console.log(match)
        this.command_log = '';
        return;
      }
    }
  },

  keypress: function() {
    var self = this;

    return function(e) {
      var chr = String.fromCharCode(e.charCode);

      if (chr.length !== 1)
        console.log('wat!');

      self.command_log = self.command_log + chr;

      self.command_check();
    }
  }
};

var vim = new Vim;

vim.nmode_remap('([0-9]*)h$', function() {});
vim.nmode_remap('([0-9]*)j$', function() {});
vim.nmode_remap('([0-9]*)k$', function() {});
vim.nmode_remap('([0-9]*)l$', function() {});

document.addEventListener('keypress', vim.keypress());

