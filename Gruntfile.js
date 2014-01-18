module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.initConfig({
    browserify: {
      basic: {
        src: ['js/main.js'],
        dest: 'out/code.js'
      }
    },
    watch: {
      scripts: {
        files: ['js/**/*.js'],
        tasks: ['browserify']
      }
    }
  });

  grunt.registerTask('default', ['browserify']);
}
