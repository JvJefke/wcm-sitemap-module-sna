const proxyquire = require("proxyquire");
const path = require("path");
const expect = require("chai").expect;
const stream = require("stream");
const fs = require("fs");

const cacheController = require("../../test/mocks/cacheController");
const contentFind = require("../../test/mocks/contentFind");
const contentTypeFind = require("../../test/mocks/contentTypeFind");
const gridfs = require("../../test/mocks/gridfs");

proxyquire.noCallThru();

describe("Sitemap generator", () => {

	describe("success", () => {
		let sitemapGen;
		let spies = {
			contentFind: contentFind([{
				meta: {
					slug: {
						nl: "nederlands-waza",
						en: "engels-waza",
						multiLanguage: true
					},
					lastModified: new Date(2018, 10, 22, 12, 23, 10, 400).getTime()
				},
			}, {
				meta: {
					slug: {
						nl: "nederlands-ploperdeplop",
						en: "engels-ploperdeplop"
					},

				lastModified: new Date(2018, 11, 23, 14, 30, 5, 300).getTime()
				},
			}]),
			contentTypeFind: contentTypeFind([{ _id: "one" }, { _id: "three" }]),
			cacheController: cacheController(),
			gridfs: gridfs("someId")
		};

		before(() => {
			sitemapGen = proxyquire("./sitemapGenerator", {
				"../helpers/variables": { get: () => ({ baseURL: "https://www.example.com/"}) },
				[path.join(process.cwd(), "app/models/content")]: spies.contentFind,
				[path.join(process.cwd(), "app/helpers/gridfs")]: spies.gridfs,
				[path.join(process.cwd(), "app/controllers/cache")]: spies.cacheController,
				[path.join(process.cwd(), "app/models/contentType")]: spies.contentTypeFind
			});
		})

		it("Should generate a sitemap", () => {
			return sitemapGen().then(() => new Promise((resolve, reject) => {
				const sitemapToCheckAgainst = fs.readFileSync(path.join(process.cwd(), "test/mocks/sitemap.xml")).toString().trimRight();

				expect(spies.gridfs.writeStreamToGridFS.calledOnce).to.be.true;
				expect(spies.gridfs.writeStreamToGridFS.firstCall.args).to.have.lengthOf(2);
				expect(spies.gridfs.writeStreamToGridFS.firstCall.args[0]).to.deep.equal({ fileName: 'sitemap.xml' });
				expect(spies.gridfs.writeStreamToGridFS.firstCall.args[1]).to.be.instanceof(stream.Readable);

				expect(spies.gridfs.remove.calledOnce).to.be.false;

				expect(spies.cacheController.set.calledOnce).to.be.true;
				expect(spies.cacheController.set.firstCall.args).to.have.lengthOf(3);
				expect(spies.cacheController.set.firstCall.args[0]).to.be.eq("sitemapKey");
				expect(spies.cacheController.set.firstCall.args[1]).to.be.eq("someId");
				expect(spies.cacheController.set.firstCall.args[2]).to.an("function");


				spies.gridfs.writeStreamToGridFS.firstCall.args[1].on("data", (data) => {

					expect(data.toString()).to.be.eq(sitemapToCheckAgainst); // trim off enters and spaces.
				});
				spies.gridfs.writeStreamToGridFS.firstCall.args[1].on("error", (error) => reject(error));
				spies.gridfs.writeStreamToGridFS.firstCall.args[1].on("end", () => resolve());

			}));
		});

		it("Should generate a sitemap again but this time cleanup the old sitemap", () => {
			return sitemapGen().then(() => {
				expect(spies.gridfs.remove.calledOnce).to.be.true;
			})
		});

	});

});

