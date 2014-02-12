var _ = require('lodash');

var GUTTER_WIDTH = 4;

/*
 * Helper Functions
 */
function gutter_pad(linum) {
  var s = linum.toString(10);
  var len = s.length;
  for (var i=0; i<(GUTTER_WIDTH - 1 - len); i++)
    s = '&nbsp;' + s;

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

function escape_str(s) {
  var o = '';
  for (var i=0; i<s.length; i++) {
    o += escape_char(s.charAt(i));
  }
  return o;
}

/*
 * Buffer Definition
 */

var Buffer = function(vim, options) {
  _.extend(this, options);
  this.vim = vim;
};

Buffer.prototype = {
  text: ['This is the song that never ends...',
        'It goes on & on my friends',
        'Some people started singing it not knowing what it was, and they will keep on singing it forever just because',
        'see <1>'],
  cursor: {col: 0, row: 0},

  apparentCursor: function() {
    if (this.cursor.col >= this.text[this.cursor.row].length) {
      if (this.vim.mode === 'insert')
        return {col: this.text[this.cursor.row].length, row: this.cursor.row};

      var len = this.text[this.cursor.row].length - 1;
      if (len < 0) len = 0;
      return {col: len, row: this.cursor.row};
    }

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
   * Character Insertion function.
   * This inserts a character (or characters) at the current cursor position
   */
  insertChar: function(c, point) {
    cursor = point || this.apparentCursor();
    var row = this.text[cursor.row];
    var before = row.substring(0, cursor.col);
    var after = row.substring(cursor.col);

    if (c === '\r' || c === '\n') {
      this.text[cursor.row] = before;
      this.text.splice(cursor.row + 1, 0, after);

      if (!point) {
        this.cursor.col = 0;
        this.cursor.row++;
      }
    } else {
      this.text[cursor.row] = before + c + after;

      if (!point)
        this.cursor.col++;
    }
  },

  /*
   * Character deletion function
   */
  deleteChar: function(point) {
    cursor = point || this.apparentCursor();
    var row = this.text[cursor.row];
    var before = row.substring(0, cursor.col);
    var after = row.substring(cursor.col + 1);

    this.text[cursor.row] = before + after;
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
        if (col === width) {
          out += '<br /><span class="linenum">&nbsp;&nbsp;&nbsp;&nbsp;</span>';
          col = 4;
        }

        if (cursor.col === i && cursor.row === line)
          out += '<span class="cursor">' + c + '</span>';
        else
          out += c;
        col++;
      }

      if (cursor.row === line && (cursor.col >= text.length ||
          this.text[this.cursor.row].length === 0)) {
        out += '<span class="cursor">&nbsp;</span>';
      }

      // Next line!
      out += '<br />';
    }

    return out;
  }

};

var Mapping = function(re, action, modifiers) {
  this.re = re;
  this.action = action;
  this.modifiers = modifiers;
};

var Vim = function(cwidth, cheight, target) {
  this.cwidth = cwidth;
  this.cheight = cheight;

  if (!target)
    target = document.body;
  this.target = target;

  this.buffer = new Buffer(this);
};

Vim.prototype = {
  mode: 'normal',
  nmode_map: [],
  exmode_map: [],

  command_log: '',
  flash: '',

  nmode_remap: function(re, action, modifiers) {
    modifiers = modifiers || [];

    if (typeof re === 'string')
      re = new RegExp(re);

    this.nmode_map.unshift(new Mapping(re, action, modifiers));
  },

  exmode_remap: function(re, action) {
    if (typeof re === 'string')
      re = new RegExp(re);

    this.exmode_map.unshift(new Mapping(re, function(match) {
      // Wrap around the call - we always change back to normal mode
      this.mode = 'normal';
      action.call(this, match);
    }));
  },

  command_check: function() {
    var map;
    switch (this.mode) {
      case 'normal':
        map = this.nmode_map; break;
      case 'ex':
        map = this.exmode_map; break;
      case 'insert':
        this.buffer.insertChar(this.command_log);
        this.command_log = '';
        this.render();
        return;
    }

    for (var i=0; i<map.length; i++) {
      var match = this.command_log.match(map[i].re);

      if (match) {
        map[i].action.call(this, match);
        this.command_log = '';

        this.render();
        return;
      }
    }

    if (this.mode === 'ex')
      this.render();
  },

  keypress: function() {
    var self = this;

    return function(e) {
      var chr = String.fromCharCode(e.charCode);

      self.command_log = self.command_log + chr;

      self.command_check();
    };
  },

  keydown: function() {
    var self = this;

    return function(e) {
      if (e.keyCode === 8) {
        /* backspace */
        if (self.mode === 'ex') {
          if (self.command_log.length > 0) {
            // Ex-mode, delete the last character in the command line
            self.command_log = self.command_log.substring(0, self.command_log.length - 1);
          } else {
            // Already empty, exit Ex-mode
            self.mode = 'normal';
          }
        } else if (self.mode === 'normal') {
          // HACK: This is equivalent (approximately) to typing 'h'
          self.command_log += 'h';
          self.command_check();
        } else if (self.mode === 'insert') {
          self.buffer.deleteChar();
          self.buffer.cursor.col--;
        }

        e.preventDefault();
      } else if (e.keyCode === 46) {
        /* delete */
        if (self.mode === 'normal') {
          // HACK: This is equivalent (approximately) to typing 'x'
          self.command_log = 'x';
          self.command_check();
        }

        e.preventDefault();
      } else if (e.keyCode === 27) {
        /* <ESC> - ESCAPE */
        if (self.mode === 'ex') {
          // Leave ex-mode
          self.mode = 'normal';
          self.command_log = '';
        } else if (self.mode === 'insert') {
          // TODO: Make this smarter
          self.buffer.cursorPrev();
          self.mode = 'normal';
          self.command_log = '';
        }

        e.preventDefault();
      }

      self.render();
    };
  },

  render: function() {
    var rendered = this.buffer.render(80);

    // When in ex-mode, render the command input line
    if (this.mode === 'ex')
      rendered += ':' + escape_str(this.command_log);
    else if (this.flash) {
      rendered += escape_str(this.flash);
      this.flash = '';
    } else
      rendered += escape_str(' -- ' + this.mode.toUpperCase() + ' -- ');

    this.target.innerHTML = rendered;
  }
};

var vim = new Vim;

/* NORMAL MODE COMMANDS */
vim.nmode_remap('([0-9]*)h$', function(match) {
  this.buffer.cursorPrev();
});
vim.nmode_remap('([0-9]*)j$', function(match) {
  this.buffer.cursorDown();
});
vim.nmode_remap('([0-9]*)k$', function(match) {
  this.buffer.cursorUp();
});
vim.nmode_remap('([0-9]*)l$', function(match) {
  this.buffer.cursorNext();
});
vim.nmode_remap('x$', function(match) {
  this.buffer.deleteChar();
});
vim.nmode_remap(':$', function(match) {
  this.mode = 'ex';
});
vim.nmode_remap('i$', function(match) {
  this.buffer.cursor = this.buffer.apparentCursor();
  this.mode = 'insert';
});

/* EX MODE COMMANDS */
vim.exmode_remap('\r$', function(match) {
  this.flash = 'ERROR: Unrecognised command (:' + this.command_log.slice(0, -1) + ') - type :help for help';
  console.log('ERROR: Unrecognised command');
});

vim.render();

document.addEventListener('keypress', vim.keypress());
document.addEventListener('keydown', vim.keydown());
