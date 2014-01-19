var _ = require('lodash');

var GUTTER_WIDTH = 4;

/*
 * Helper Functions
 */
function gutter_pad(linum) {
  var s = linum.toString(10);
  var len = s.length;
  for (var i=0; i<(GUTTER_WIDTH - 1 - len); i++)
    s = s + '&nbsp;';

  return s;
}

function escape_char(c) {
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

/*
 * Buffer Definition
 */

Buffer = function(options) {
  _.extend(this, options);
};

Buffer.prototype = {
  mode: 'normal',
  text: ['This is the song that never ends...',
        'It goes on & on my friends',
        'Some people started singing it not knowing what it was, and they will keep on singing it forever just because',
        'see <1>'],
  cursor: {col: 0, row: 0},

  apparentCursor: function() {
    if (this.cursor.col >= this.text[this.cursor.row].length)
      return {col: this.text[this.cursor.row].length - 1, row: this.cursor.row};

    return this.cursor;
  },

  /*
   * Cursor movement functions.
   * These move the cursor to the previous, next, etc line.
   */
  cursorPrev: function() {
    if (this.cursor.col > 0)
      this.cursor.col = this.apparentCursor().col - 1;
  },

  cursorNext: function() {
    var len = this.text[this.cursor.row].length;
    if (this.mode === 'normal')
      len--;

    if (this.cursor.col < len)
      this.cursor.col++;
  },

  cursorUp: function() {
    if (this.cursor.row > 0)
      this.cursor.row--;
  },

  cursorDown: function() {
    if (this.cursor.row < this.text.length - 1)
      this.cursor.row++;
  },

  /*
   * Rendering functions
   * Generates html-escaped text which can be printed
   * in monospace font to display the vim buffer
   */

  render: function(width) {
    var cursor = this.apparentCursor();
    var out = '';

    for (var line=0; line<this.text.length; line++) {
      var text = this.text[line];

      // Display the line number!
      var col = 4;
      out += '<span class="linenum">' + gutter_pad(line + 1) + '&nbsp;</span>';

      for (var i=0; i<text.length; i++) {
        // Get and escape the character
        var c = text.charAt(i);
        c = escape_char(c);

        // Wrap lines
        if (col === 80) {
          out += '<br /><span class="linenum">&nbsp;&nbsp;&nbsp;&nbsp;</span>';
          col = 4;
        }

        if (cursor.col === i && cursor.row === line)
          out += '<span class="cursor">' + c + '</span>';
        else
          out += c;
        col++;
      }

      if (cursor.row === line && cursor.col >= text.length) {
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

