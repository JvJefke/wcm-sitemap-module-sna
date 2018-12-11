const sinon = require("sinon");

module.exports = () => ({
	set: sinon.spy((key, id, callback) => callback(null)),
	get: sinon.spy((key, expireTime, cb) => cb(null, "someId")),
});
