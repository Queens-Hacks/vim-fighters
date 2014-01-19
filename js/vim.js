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
  cursor: [1,0],

  /*
   * Cursor movement functions.
   * These move the cursor to the previous, next, etc line.
   */
  cursorPrev: function() {
    var col = this.cursor[1];
    var row = this.cursor[0];

    col--;
    if (col < 0)
      return;

    this.cursor = [row, col];
  },
  cursorNext: function() {
    var col = this.cursor[1];
    var row = this.cursor[0];

    col++;
    if (col > this.text[row].length)
      return;

    this.cursor = [row, col];
  },
  cursorUp: function() {
    this.cursor[0]--;
    if (this.cursor[0] < 0)
      this.cursor[0]++;
  },
  cursorDown: function() {
    this.cursor[0]++;
    if (this.cursor[0] >= this.text.length)
      this.cursor[0]--;
  },

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

  buffer: new Buffer,

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
        map[i].action.call(this.buffer, match);
        this.command_log = '';

        this.render();
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
  },

  render: function() {
    document.body.innerHTML = this.buffer.render();
  }
};

var vim = new Vim;

vim.nmode_remap('([0-9]*)h$', function(match) {
  this.cursorPrev();
});
vim.nmode_remap('([0-9]*)j$', function(match) {
  this.cursorDown();
});
vim.nmode_remap('([0-9]*)k$', function(match) {
  this.cursorUp();
});
vim.nmode_remap('([0-9]*)l$', function(match) {
  this.cursorNext();
});

vim.render();

document.addEventListener('keypress', vim.keypress());

