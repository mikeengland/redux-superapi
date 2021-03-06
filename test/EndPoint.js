import chai, {expect} from "chai";
import chaiSubset from "chai-subset";
import EndPoint from "../src/EndPoint";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import MockAdapter from "axios-mock-adapter";
import configureMockStore from "redux-mock-store";
import thunk from "redux-thunk";

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

var mock = new MockAdapter(EndPoint.axios, {delayResponse: 50});
mock.onAny(/.*/).reply(200);

chai.use(chaiSubset);
chai.use(sinonChai);

describe('EndPoint', () => {

    it('has all http methods', () => {
        const endPoint = new EndPoint('test', {url: '/api/buckets/'});
        expect(endPoint).to.contain.all.keys(['delete', 'get', 'head', 'options', 'post', 'put', 'patch']);
    });

    describe('dispatch()', () => {
        it('creates _request and _success actions for a successful endPoint.get()', (done) => {
            const store = mockStore({});
            const endPoint = new EndPoint('test', {url: '/api/buckets/'});
            store.dispatch(endPoint.get()).then(function() {
                expect(store.getActions().map(action => action.type)).to.eql([
                    '@@super-api@test_request',
                    '@@super-api@test_success'
                ]);
                done();
            }).catch(done);
        });

        it('aborts request on reset', () => {
            const store = mockStore({});
            const endPoint = new EndPoint('test', {url: '/api/buckets/'});
            sinon.spy(endPoint, 'cancel');
            store.dispatch(endPoint.reset());
            expect(endPoint.cancel).to.have.been.calledOnce;
        });
    });

    describe('.transformUrl()', () => {
        it('can do nothing', function () {
            const endPoint = new EndPoint('test', {url: '/api/buckets/'});
            expect(endPoint.transformUrl()).to.equal('/api/buckets/')
        });

        it('can replace an argument', function () {
            const endPoint = new EndPoint('test', {url: '/api/buckets/:bucketId/'});
            expect(endPoint.transformUrl({bucketId: 42})).to.equal('/api/buckets/42/')
        });

        it('removes unspecified arguments', function () {
            const endPoint = new EndPoint('test', {url: '/api/buckets/:bucketId/'});
            expect(endPoint.transformUrl()).to.equal('/api/buckets/')
        });
    });


    describe('.reduce()', () => {
        const endPoint = new EndPoint('test', {url: '/api/buckets/'});

        it('has correct default state', function () {
            expect(endPoint.reduce(undefined, {})).to.deep.equal({
                loading: false,
                syncing: false,
                sync: false,
                data: {},
                error: null
            });
        });

        it('transitions flags on request', function () {
            const oldState = {
                loading: false,
                syncing: false,
                sync: false
            };
            const action = endPoint.actionRequest('get');

            expect(endPoint.reduce(oldState, action)).to.containSubset({
                loading: true,
                syncing: true,
                sync: false
            });
        });

        it('transitions flags on success', function () {
            const oldState = {
                loading: true,
                syncing: true,
                sync: false
            };
            const action = endPoint.actionSuccess({});

            expect(endPoint.reduce(oldState, action)).to.containSubset({
                loading: false,
                syncing: false,
                sync: true,
            });
        });

        it('sets data on success', function () {
            const data = {sample: true};
            const oldState = {data: {}};
            const action = endPoint.actionSuccess(({data}));

            expect(endPoint.reduce(oldState, action).data).to.deep.equal(data);
        });
    });

});


describe('Multi-request Endpoint', () => {
    const endPoint = new EndPoint('test', {
        url: '/api/buckets/:bucketId/',
        requestKey: (args) => args.bucketId
    });

    describe('.reduce()', () => {
        it('has empty state by default', function () {
            expect(endPoint.reduce(undefined, {})).to.be.empty;
        });

        it('sets default state on reset', function () {
            const action = endPoint.actionReset(({bucketId: 42}));

            expect(endPoint.reduce(undefined, action)).to.deep.equal({
                '42': {
                    loading: false,
                    syncing: false,
                    sync: false,
                    data: {},
                    error: null
                }
            });
        });
    });
});
