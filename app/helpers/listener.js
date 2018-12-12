const R = require("ramda");
const request = require("request-promise-native");
const wcmEventWrapper = require("@wcm/module-helper").emitter;
const variablesHelper = require("./variables");
const ContentTypeModel = require("@wcm/module-helper").models.ContentType;

const DEFAULT_FREQ = "daily";

const getContentType = (_id) => ContentTypeModel.findOne({ _id }).lean().exec();

const getLeanContent = (content) => content.toObject ? content.toObject() : content;

// Generate an object representation of a sitemap entry
const generateCustomMap = (location, lastmod, changefreq) => {
	return { loc: variablesHelper.get().baseURL + location, lastmod, changefreq };
};

const getLocations = (contentItem) => R.compose(
	R.map(([lang, slug]) => `/${lang}/${slug}`),
	R.toPairs,
	R.omit(["multiLanguage"]),
	R.pathOr(null, ["meta", "slug"])
)(contentItem)

const isPage = (contentItem) => R.compose(
    R.ifElse(
        R.is(String),
        getContentType,
        (ct) => Promise.resolve(ct)
    ),
    R.path(["meta", "contentType"])
)(contentItem).then((ct) => R.path(["meta", "canBeFiltered"])(ct));

const generateSitemapObjects = (content) => {
	const lastmod = R.pathOr(new Date().toISOString(), ["meta", "lastModified"])(content);

	return R.compose(
		R.map((loc) => generateCustomMap(loc, lastmod, DEFAULT_FREQ)),
		getLocations
	)(content);
};

const sendSSRRequest = (method, body) => request({
	url: variablesHelper.get().ssrURL,
	headers: {
		apikey: variablesHelper.get().ssrKey,
	},
	method,
	body,
	json: true,
});

const contentChangeHandler = (content) => {
	const leanContent = getLeanContent(content);

	// Skip if the content item is not published
	if (!R.path(["meta", "published"])(leanContent)) {
		return;
	}

	return isPage(leanContent).then((contentIsPage) => {
		// Skip if the content is not a page
		if (!contentIsPage) {
			return;
		}

		return generateSitemapObjects(leanContent);
	}).then((data) => data ? sendSSRRequest("POST", data) : null)
};

const contentRemoveHandler = (content) => {
	const leanContent = getLeanContent(content);

	return isPage(leanContent).then((contentIsPage) => {
		// Skip if the content is not a page
		if (!contentIsPage) {
			return;
		}

		return generateSitemapObjects(leanContent);
	}).then((data) => sendSSRRequest("DELETE", data));
};

const stop = module.exports.stop = () => {
	wcmEventWrapper.off("content.created", contentChangeHandler);
	wcmEventWrapper.off("content.updated", contentChangeHandler);
	wcmEventWrapper.off("content.removed", contentRemoveHandler);
	wcmEventWrapper.off("content.unpublished", contentRemoveHandler);
}

module.exports.start = () => {
	stop();

	wcmEventWrapper.on("content.created", contentChangeHandler);
	wcmEventWrapper.on("content.updated", contentChangeHandler);
	wcmEventWrapper.on("content.removed", contentRemoveHandler);
	wcmEventWrapper.on("content.unpublished", contentRemoveHandler);
}


