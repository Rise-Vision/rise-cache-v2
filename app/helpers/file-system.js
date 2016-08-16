import mkdirp from "mkdirp";

// Create directory if it does not already exist.
export function createDirectory(dir) {
  mkdirp(dir, (err) => {
    if (err) {
      // TODO: Directory could not be created. Log it.
    }
  });
}