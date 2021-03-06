const CronJob = require("cron").CronJob;
const config = require("@wcm/module-helper").getConfig();
const variablesHelper = require("./variables");
const sitemapGenerator = require("../helpers/sitemapGenerator");

let job;

module.exports.init = () => {
	if (job) {
		job.stop();
	}

	const variables = variablesHelper.get();

	job = new CronJob({
		cronTime: variables.cron,
		onTick: () => {
			console.log("CRON: GENERATING SITEMAP."); // eslint-disable-line no-console
			return sitemapGenerator()
				.then(() => console.log("CRON: SITEMAP GENERATED!"), // eslint-disable-line no-console
					(err) => console.log("CRON: SITEMAP GENERATION FAILED => ", err) // eslint-disable-line no-console
				);
		},
		onComplete: () => console.log(null, "CRON: SITEMAP GENERATION COMPLETE!"), // eslint-disable-line no-console
		start: true,
		timeZone: config.server.modules.cron.timeZone,
		runOnInit: true
	});
}

module.exports.stop = () => job.stop();
module.exports.start = () => job.start();
