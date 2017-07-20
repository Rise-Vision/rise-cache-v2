"use strict";

const eslint = require("gulp-eslint"),
  gulp = require("gulp"),
  mocha = require("gulp-spawn-mocha");

gulp.task("lint", (cb) => {
  return gulp.src(["./**/*.js", "!node_modules/**", "!test/**", "!gulpfile.js"])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task("test-unit", ["lint"], () =>
  gulp.src("test/unit/**/*-test.js", {read: false})
    .pipe(mocha({reporter: "spec"}))
);

gulp.task("test-integration", ["lint"], () =>
    gulp.src("test/integration/**/*-test.js", {read: false})
      .pipe(mocha({reporter: "spec"}))
);

gulp.task("test", ["test-unit", "test-integration"]);


gulp.task("default", ["test"]);