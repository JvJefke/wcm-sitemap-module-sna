const setupRoutes = require("./routes");
const variablesHelper = require("./helpers/variables");
const hooksController = require("./controllers/hooks");

module.exports = (app, hooks, moduleInfo) => {
	// Get variables
	variablesHelper.reload(moduleInfo)
		.then((variables) => {
			// do some stuff that needs the variables first
		});

	// Handle hooks
	hooksController.handleHooks(hooks);

	// Setup routes
	setupRoutes(app, moduleInfo);
};
