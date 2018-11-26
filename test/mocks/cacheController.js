const sinon = require("sinon");

module.exports = () => ({
	set: sinon.spy((key, id, callback) => callback(null)),
});
