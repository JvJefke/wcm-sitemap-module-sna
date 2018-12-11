const EventEmitter = require("eventemitter2").EventEmitter2;
const expect = require("chai").expect;
const sinon = require("sinon");
const proxyquire = require("proxyquire");
const R = require("ramda");

proxyquire.noCallThru();

const getEmitter = () => new EventEmitter({
	// delimiter: "."
});
const getContentTypeModel = (response) => ({
	findOne: sinon.spy(() => ({
		lean: sinon.spy(() => ({
			exec: sinon.spy(() => Promise.resolve(response))
		}))
	}))
});
const getRequest = () => sinon.spy(() => Promise.resolve());
const getListener = (emitter, ContentType, request) => proxyquire("./listener", {
	"@wcm/module-helper": {
		emitter,
		models: {
			ContentType,
		}
	},
	"./variables": {
		get: () => ({
			baseURL: "https://example.com",
			ssrURL: "https://ssr-worker-service.be",
			ssrApiKey: "some-ssr-key",
		})
	},
	"request-promise-native": request
});

describe("Listener", () => {
	let listener = null;
	let emitter = null;
	let request = null;

	const dataToEmit = {
		meta: {
			slug: {
				nl: "nl-slug",
				en: "en-slug",
				multiLanguage: true
			},
			lastModified: new Date().toISOString(),
			contentType: "some-uuid",
			published: true
		}
	};

	const upsertValidator = (eventName) => emitter.emitAsync(eventName, R.clone(dataToEmit))
		.then(() => {
			expect(request.calledOnce).to.be.true;
			expect(request.firstCall.args).to.have.length(1);

			const requestOpt = request.firstCall.args[0];

			expect(requestOpt).to.be.an("object");
			expect(requestOpt.url).to.equal("https://ssr-worker-service.be");
			expect(requestOpt.headers).to.be.an("object");
			expect(requestOpt.headers.Authorization).to.equal("token some-ssr-key");
			expect(requestOpt.method).to.equal("POST");
			expect(requestOpt.json).to.be.true;
			expect(requestOpt.body).to.be.an("array");
			expect(requestOpt.body).to.have.lengthOf(2);
			expect(requestOpt.body[0]).to.be.an("object");
			expect(requestOpt.body[0].loc).to.equal(`https://example.com/nl/${dataToEmit.meta.slug.nl}`);
			expect(requestOpt.body[0].lastmod).to.equal(dataToEmit.meta.lastModified);
			expect(requestOpt.body[0].changefreq).to.equal("daily");
			expect(requestOpt.body[1]).to.be.an("object");
			expect(requestOpt.body[1].loc).to.equal(`https://example.com/en/${dataToEmit.meta.slug.en}`);
			expect(requestOpt.body[1].lastmod).to.equal(dataToEmit.meta.lastModified);
			expect(requestOpt.body[1].changefreq).to.equal("daily");
		});

	const deleteValidator = (eventName) => emitter.emitAsync(eventName, R.clone(dataToEmit))
		.then(() => {
			expect(request.calledOnce).to.be.true;
			expect(request.firstCall.args).to.have.length(1);

			const requestOpt = request.firstCall.args[0];

			expect(requestOpt).to.be.an("object");
			expect(requestOpt.url).to.equal("https://ssr-worker-service.be");
			expect(requestOpt.headers).to.be.an("object");
			expect(requestOpt.headers.Authorization).to.equal("token some-ssr-key");
			expect(requestOpt.method).to.equal("DELETE");
			expect(requestOpt.json).to.be.true;
			expect(requestOpt.body).to.be.an("array");
			expect(requestOpt.body).to.have.lengthOf(2);
			expect(requestOpt.body[0]).to.be.an("object");
			expect(requestOpt.body[0].loc).to.equal(`https://example.com/nl/${dataToEmit.meta.slug.nl}`);
			expect(requestOpt.body[1]).to.be.an("object");
			expect(requestOpt.body[1].loc).to.equal(`https://example.com/en/${dataToEmit.meta.slug.en}`);
		});


	beforeEach(() => {
		emitter = getEmitter();
		request = getRequest();

		listener = getListener(emitter, getContentTypeModel({
			meta: {
				canBeFiltered: true
			}
		}), request);
		listener.start();
	});

	afterEach(() => {
		emitter.removeAllListeners();
		emitter = null;

		listener.stop();
		listener = null;
	});

	it("Should send a render request on create", () => {
		return upsertValidator("content.created")
	});

	it("Should send a render request on update", () => {
		return upsertValidator("content.updated")
	});

	it("Should send a render invalidate request on delete", () => {
		return deleteValidator("content.removed");
	});

	it("Should send a render invalidate request on unpublish", () => {
		return deleteValidator("content.unpublished");
	});

	it("Should not listen to events after the stop function is called", (done) => {
		listener.stop();

		emitter.emitAsync("content.updated", R.clone(dataToEmit), () => {});

		setTimeout(() => {
			expect(request.calledOnce).to.be.false;
			done();
		}, 300);
	});
})
