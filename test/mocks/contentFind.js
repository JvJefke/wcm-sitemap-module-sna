const sinon = require("sinon");

module.exports = (response) => ({
	find: sinon.spy(() => ({
		lean: () => ({ exec: () => new Promise((resolve) => resolve(response)) })
	}))
});
