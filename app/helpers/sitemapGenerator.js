const R = require("ramda");
const path = require("path");
const stream = require("stream");
const xmlBuilder = require("xmlbuilder");

const variablesHelper = require("../helpers/variables");

const ContentModel = require(path.join(process.cwd(), "app/models/content"));
const gridFSHelper = require(path.join(process.cwd(), "app/helpers/gridfs"));
const cacheController = require(path.join(process.cwd(), "app/controllers/cache"));
const ContentTypeModel = require(path.join(process.cwd(), "app/models/contentType"));

const defaultReturnFields = {
	"meta.lastModified": 1,
	"meta.created": 1,
    "meta.slug": 1
};
const DEFAULT_FREQ = "daily";
const SITEMAP_CACHE_KEY = "sitemapKey";

let currCachId = null;

// Get de lastModified property of the content item and convert it to a valid ISO string
const getLastMod = (contentItem) => R.compose(
	(date) => new Date(date).toISOString(),
	(item) => R.pathOr(null, ["meta", "lastModified"])(item) || R.pathOr(null, ["meta", "created"])(item)
)(contentItem);

// Generate an object representation of a sitemap entry
const generateCustomMap = (location, lastmod, changefreq) => {
	return { location: variablesHelper.get().baseURL + location, lastmod, changefreq };
};

// Get slug of a content item and convert it to "[key(=lang)]/[value(=slug)]""
const getLocations = (contentItem) => R.compose(
	R.map(([lang, slug]) => `${lang}/${slug}`),
	R.toPairs,
	R.omit(["multiLanguage"]),
	R.pathOr(null, ["meta", "slug"])
)(contentItem)

// Get the slugs (for each language) of a content item and map it to a object representation of a sitemap entry
const generateContentMap = (contentItem) => R.compose(
	R.map((loc) => generateCustomMap(loc, getLastMod(contentItem), DEFAULT_FREQ)),
	getLocations
)(contentItem);

// Get content based on all page types and map it to sitemap objects
const getContentAndMapIt = () => R.composeP(
	R.flatten,
	R.map(generateContentMap),
	(ids) => ContentModel.find({
		"meta.published": true,
		"meta.deleted": false,
		"meta.contentType": { $in: ids}
	}, defaultReturnFields).lean().exec(),
	R.map(R.prop("_id")),
	() => ContentTypeModel.find({ "meta.canBeFiltered": 1 }, { _id: 1 })
)();

const removeOldSiteMap = (id) => id ? gridFSHelper.remove(id) : null;

const generateXMLSitemap = (sitemapArray) => {
	const urlSet = xmlBuilder.create("urlset", { version: "1.0", encoding: "UTF-8" });

	urlSet.att("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
	urlSet.att("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
	urlSet.att("xsi:schemaLocation", "http://www.sitemaps.org/schemas/sitemap/0.9");

	sitemapArray.forEach((item) => {
		if (!item || !item.location) {
			return;
		}

		const url = urlSet.ele("url");

		url.ele("loc", null, item.location);

		if (item.lastmod) {
			url.ele("lastmod", null, item.lastmod);
		}

		if (item.changefreq) {
			url.ele("changefreq", null, item.changefreq);
		}
	});

	return urlSet.end();
};

module.exports = () => {
	const oldCacheId = currCachId;

	return getContentAndMapIt()
		.then((sitemapArray) => {
			const sitemap = generateXMLSitemap(sitemapArray);
			const readable = new stream.Readable();

			readable.push(sitemap);
			readable.push(null);

			return gridFSHelper.writeStreamToGridFS({ fileName: "sitemap.xml" }, readable)
		})
		.then((cachedItem) => new Promise((resolve, reject) => cacheController.set(
			SITEMAP_CACHE_KEY,
			cachedItem._id,
			(err) => err ? reject(err) : resolve(cachedItem._id))
		))
		.then((id) => currCachId = id)
		.then(() => removeOldSiteMap(oldCacheId))
};

module.exports.getSitemapId = () => currCachId;
