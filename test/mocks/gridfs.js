const sinon = require("sinon");

module.exports = (id) => ({
	remove: sinon.spy(() => new Promise((resolve) => resolve())),
	writeStreamToGridFS: sinon.spy(() => new Promise((resolve) => resolve({ _id: id}))),
});
