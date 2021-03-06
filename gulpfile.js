/* jshint node: true */

(function () {
  "use strict";

  var gulp = require("gulp");
  var gutil = require("gulp-util");
  var concat = require("gulp-concat");
  var bump = require("gulp-bump");
  var jshint = require("gulp-jshint");
  var minifyCSS = require("gulp-minify-css");
  var usemin = require("gulp-usemin");
  var uglify = require("gulp-uglify");
  var runSequence = require("run-sequence");
  var path = require("path");
  var rename = require("gulp-rename");
  var factory = require("widget-tester").gulpTaskFactory;
  var sourcemaps = require("gulp-sourcemaps");
  var html2js = require("gulp-html2js");
  var del = require("del");
  var bower = require("gulp-bower");
  var colors = require("colors");

  var appJSFiles = [
    "src/**/*.js",
    "!./src/components/**/*"
  ];

  gulp.task("clean-bower", function(cb){
    del(["./src/components/**"], cb);
  });

  gulp.task("clean", function (cb) {
    del(['./dist/**'], cb);
  });

  gulp.task("config", function() {
    var env = process.env.NODE_ENV || "dev";
    gutil.log("Environment is", env);

    return gulp.src(["./src/config/" + env + ".js"])
      .pipe(rename("config.js"))
      .pipe(gulp.dest("./src/config"));
  });

  gulp.task("bump", function(){
    return gulp.src(["./package.json", "./bower.json"])
      .pipe(bump({type:"patch"}))
      .pipe(gulp.dest("./"));
  });

  gulp.task("lint", function() {
    return gulp.src(appJSFiles)
      .pipe(jshint())
      .pipe(jshint.reporter("jshint-stylish"))
      .pipe(jshint.reporter("fail"));
  });

  gulp.task("source", ["lint"], function () {
    return gulp.src(['./src/settings.html', './src/widget.html'])
      .pipe(usemin({
        css: [minifyCSS()],
        js: [sourcemaps.init(), uglify(), sourcemaps.write()]
      }))
      .pipe(gulp.dest("dist/"));
  });

  gulp.task("unminify", function () {
    return gulp.src(['./src/settings.html', './src/widget.html'])
      .pipe(usemin({
        css: [rename(function (path) {
          path.basename = path.basename.substring(0, path.basename.indexOf(".min"))
        }), gulp.dest("dist")],
        js: [rename(function (path) {
          path.basename = path.basename.substring(0, path.basename.indexOf(".min"))
        }), gulp.dest("dist")]
      }))
  });

  gulp.task("fonts", function() {
    return gulp.src("src/components/common-style/dist/fonts/**/*")
      .pipe(gulp.dest("dist/fonts"));
  });

  gulp.task("images", function() {
    return gulp.src("src/components/rv-bootstrap-formhelpers/img/bootstrap-formhelpers-googlefonts.png")
      .pipe(gulp.dest("dist/img"));
  });

  gulp.task("i18n", function(cb) {
    return gulp.src(["src/components/rv-common-i18n/dist/locales/**/*"])
      .pipe(gulp.dest("dist/locales"));
  });

  gulp.task("rise-storage", function() {
    return gulp.src([
      "src/components/webcomponentsjs/webcomponents*.js",
      "src/components/web-component-rise-storage/rise-storage.html",
      "src/components/polymer/**/*.*{html,js}",
      "src/components/core-ajax/*.*{html,js}",
      "src/components/underscore/*.js"
    ], {base: "./src/"})
      .pipe(gulp.dest("dist/"));
  });

  gulp.task("webdriver_update", factory.webdriveUpdate());
  gulp.task("test:metrics", factory.metrics());

  // ***** e2e Testing ***** //
  gulp.task("e2e:server-close", factory.testServerClose());

  gulp.task("e2e:server", ["config", "html:e2e"], factory.testServer());

  gulp.task("html:e2e",
    factory.htmlE2E({
      files: ["./src/settings.html", "./src/widget.html"],
      e2eMockData: "../test/mock-data.js",
      e2eStorageMock: "../node_modules/widget-tester/mocks/rise-storage-mock.js"
    }));

  // ** Settings ** //
  gulp.task("test:e2e:settings", ["webdriver_update"], factory.testE2EAngular({
      testFiles: "test/e2e/settings-scenarios.js"}
  ));

  // ** Widget ** //
  gulp.task("test:e2e:widget", factory.testE2E({
      testFiles: "test/e2e/widget-scenarios.js"}
  ));

  gulp.task("test:e2e", function(cb) {
    runSequence(["html:e2e", "e2e:server"], "test:e2e:widget", "test:e2e:settings", "e2e:server-close", cb);
  });

  // ****** Unit Testing ***** //
  gulp.task("test:unit:settings", factory.testUnitAngular(
    {testFiles: [
      "src/components/jquery/dist/jquery.js",
      "src/components/q/q.js",
      "src/components/angular/angular.js",
      "src/components/angular-translate/angular-translate.js",
      "src/components/angular-translate-loader-static-files/angular-translate-loader-static-files.js",
      "src/components/angular-route/angular-route.js",
      "src/components/angular-mocks/angular-mocks.js",
      "node_modules/widget-tester/mocks/common-mock.js",
      "src/components/bootstrap-sass-official/assets/javascripts/bootstrap.js",
      "src/components/angular-bootstrap/ui-bootstrap-tpls.js",
      "src/components/component-storage-selector/dist/storage-selector.js",
      "src/components/widget-settings-ui-components/dist/js/**/*.js",
      "src/components/widget-settings-ui-core/dist/*.js",
      "src/components/bootstrap-form-components/dist/js/**/*.js",
      "src/components/rv-angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.js",
      "src/config/test.js",
      "src/settings/settings-app.js",
      "src/settings/**/*.js",
      "test/mock-data.js",
      "test/unit/settings/**/*spec.js"]}
  ));

  gulp.task("test:unit:widget", factory.testUnitAngular(
    {testFiles: [
      "src/components/jquery/dist/jquery.js",
      "test/mock-data.js",
      "node_modules/widget-tester/mocks/gadget-mocks.js",
      "src/config/test.js",
      "src/widget/webpage.js",
      "src/components/widget-common/dist/background.js",
      "src/widget/main.js",
      "test/unit/widget/**/*spec.js"]}
  ));

  gulp.task("test:unit", function(cb) {
    runSequence("test:unit:widget", "test:unit:settings", cb);
  });

  // ***** Primary Tasks ***** //
  gulp.task("bower-clean-install", ["clean-bower"], function(cb){
    return bower().on("error", function(err) {
      console.log(err);
      cb();
    });
  });

  gulp.task("test", function(cb) {
    runSequence("build", "test:unit", "test:e2e", "test:metrics", cb);
  });

  gulp.task("build", function (cb) {
    runSequence(["clean", "config"], ["source", "fonts", "images", "i18n", "rise-storage"], ["unminify"], cb);
  });

  gulp.task("default", [], function() {
    console.log("********************************************************************".yellow);
    console.log("  gulp bower-clean-install: delete and re-install bower components".yellow);
    console.log("  gulp test: run e2e and unit tests".yellow);
    console.log("  gulp build: build a distribution version".yellow);
    console.log("********************************************************************".yellow);
    return true;
  });

})();
