const setupRoutes = require("./routes");
const variablesHelper = require("./helpers/variables");
const hooksController = require("./controllers/hooks");
const cronController = require("./helpers/cron");
const listener = require("./helpers/listener");

module.exports = (app, hooks, moduleInfo) => {
	// Get variables
	variablesHelper.reload(moduleInfo).then(() => {
		cronController.init();
		listener.start();
	});

	// Handle hooks
	hooksController.handleHooks(hooks);

	// Setup routes
	setupRoutes(app, moduleInfo);
};
