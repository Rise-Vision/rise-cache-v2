"use strict";

const babel = require("babel-core/register"),
  gulp = require("gulp"),
  mocha = require("gulp-mocha");

gulp.task("test", () =>
  gulp.src("test/test-*.js", {read: false})
    .pipe(mocha({reporter: "nyan"}))
);

gulp.task("default", ["test"]);