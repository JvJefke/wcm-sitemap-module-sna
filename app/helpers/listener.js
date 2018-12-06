const R = require("ramda");
const request = require("request-promise-native");
const wcmEventWrapper = require("@wcm/module-helper").emitter;
const variablesHelper = require("./variables");
const ContentTypeModel = require("@wcm/module-helper").models.ContentType;

const getContentType = (_id) => ContentTypeModel.findOne({ _id }).lean().exec();

// Generate an object representation of a sitemap entry
const generateCustomMap = (location, lastmod, changefreq) => {
	return { location: variablesHelper.get().baseURL + location, lastmod, changefreq };
};

const getLocations = (contentItem) => R.compose(
	R.map(([lang, slug]) => `/${lang}/${slug}`),
	R.toPairs,
	R.omit(["multiLanguage"]),
	R.pathOr(null, ["meta", "slug"])
)(contentItem)

const isPage = (content) => R.composeP(
	R.ifElse(
		R.type("String"),
		getContentType,
		R.prop("uuid")
	),
	R.path(["meta", "contentType"])
)(content).then((ct) => R.path(["meta", "canBeFiltered"])(ct));

const generateSitemapObjects = () => {
	const lastmod = R.pathOr(new Date().toISOString(), ["meta", "lastModified"])(content);

	return R.compose(
		R.map((loc) => generateCustomMap({ loc, lastmod })),
		getLocations
	)(content);
};

const contentChangeHandler = (content) => {
	console.log("change", content);

	// Skip if the content item is not published
	if (!R.path(["meta", "published"])(content)) {
		return;
	}

	return isPage(content).then((contentIsPage) => {
		// Skip if the content is not a page
		if (!contentIsPage) {
			return;
		}

		const data = generateSitemapObjects(content);

		console.log("send change data", data);
	});
};

const contentRemoveHandler = (content) => {
	console.log("remove", content)

	return isPage(content).then((contentIsPage) => {
		// Skip if the content is not a page
		if (!contentIsPage) {
			return;
		}

		const data = generateSitemapObjects(content);

		console.log("send remove data", data);
	});
};

module.exports.start = () => {
	wcmEventWrapper.on("content.created", contentChangeHandler);
	wcmEventWrapper.on("content.updated", contentChangeHandler);
	wcmEventWrapper.on("content.removed", contentRemoveHandler);
	wcmEventWrapper.on("content.unpublished", contentRemoveHandler);
}

module.exports.stop = () => {
	wcmEventWrapper.off("content.created", contentChangeHandler);
	wcmEventWrapper.off("content.updated", contentChangeHandler);
	wcmEventWrapper.off("content.removed", contentRemoveHandler);
	wcmEventWrapper.off("content.unpublished", contentRemoveHandler);
}
