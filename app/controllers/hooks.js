const variablesHelper = require("../helpers/variables");
const cronController = require("../helpers/cron");

const onLoadComplete = () => {
	// Initiate passport strategies
	variablesHelper.reload().then(() => cronController.init());
};
const onConfigurationChanged = () => {
	// Initiate passport strategies
	variablesHelper.reload().then(() => cronController.init());
};

const beforeRemove = () => {
	cronController.stop();
}

module.exports.handleHooks = (hooks) => Object.assign(hooks, {
	onLoadComplete,
	onConfigurationChanged,
	beforeRemove,
});
