"use strict";

const eslint = require("gulp-eslint"),
  gulp = require("gulp"),
  mocha = require("gulp-mocha");

gulp.task("lint", (cb) => {
  return gulp.src(["./**/*.js", "!node_modules/**", "!test/**", "!gulpfile.js"])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task("test", ["lint"], () =>
  gulp.src("test/**/*-test.js", {read: false})
    .pipe(mocha({reporter: "nyan"}))
);

gulp.task("default", ["test"]);