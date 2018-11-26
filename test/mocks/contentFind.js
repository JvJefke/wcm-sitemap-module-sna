const sinon = require("sinon");

module.exports = (response) => ({
	find: sinon.spy(() => new Promise((resolve) => resolve(response)))
});
