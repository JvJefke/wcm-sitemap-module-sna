const variablesHelper = require("../helpers/variables");
const cronController = require("../helpers/cron");
const listener = require("../helpers/listener");

const onLoadComplete = () => {
	// Initiate passport strategies
	variablesHelper.reload().then(() => {
		cronController.init();
		listener.start();
	});
};
const onConfigurationChanged = () => {
	// Initiate passport strategies
	variablesHelper.reload().then(() => {
		cronController.init();
		listener.start();
	});
};

const beforeRemove = () => {
	cronController.stop();
	listener.stop();
}

module.exports.handleHooks = (hooks) => Object.assign(hooks, {
	onLoadComplete,
	onConfigurationChanged,
	beforeRemove,
});
