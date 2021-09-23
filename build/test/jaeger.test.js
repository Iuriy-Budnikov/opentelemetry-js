"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const src_1 = require("../src");
const core_1 = require("@opentelemetry/core");
const api = require("@opentelemetry/api");
const api_1 = require("@opentelemetry/api");
const resources_1 = require("@opentelemetry/resources");
const nock = require("nock");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
describe('JaegerExporter', () => {
    const readableSpan = {
        name: 'my-span1',
        kind: api.SpanKind.CLIENT,
        spanContext: () => {
            return {
                traceId: 'd4cda95b652f4a1592b449d5929fda1b',
                spanId: '6e0c63257de34c92',
                traceFlags: api_1.TraceFlags.NONE,
            };
        },
        startTime: [1566156729, 709],
        endTime: [1566156731, 709],
        ended: true,
        status: {
            code: api.SpanStatusCode.ERROR,
        },
        attributes: {},
        links: [],
        events: [],
        duration: [32, 800000000],
        resource: new resources_1.Resource({
            [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'opentelemetry'
        }),
        instrumentationLibrary: {
            name: 'default',
            version: '0.0.1',
        },
    };
    describe('constructor', () => {
        afterEach(() => {
            delete process.env.OTEL_EXPORTER_JAEGER_AGENT_HOST;
        });
        it('should construct an exporter', () => {
            const exporter = new src_1.JaegerExporter();
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
        });
        it('should get service name from the the service name resource attribute of the first exported span', done => {
            const mockedEndpoint = 'http://testendpoint';
            const scope = nock(mockedEndpoint)
                .post('/')
                .reply(202);
            const exporter = new src_1.JaegerExporter({
                endpoint: mockedEndpoint,
            });
            exporter.export([readableSpan], result => {
                assert.strictEqual(result.code, core_1.ExportResultCode.SUCCESS);
                assert.strictEqual(exporter['_sender']._batch.process.serviceName, 'opentelemetry');
                scope.done();
                done();
            });
        });
        it('should construct an exporter with host, port, logger and tags', () => {
            const exporter = new src_1.JaegerExporter({
                host: 'remotehost',
                port: 8080,
                tags: [{ key: 'opentelemetry-exporter-jaeger', value: '0.1.0' }],
            });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            const process = exporter['_getSender']({
                tags: [{
                        key: 'service.name',
                        vStr: 'opentelemetry'
                    }]
            })._process;
            assert.strictEqual(exporter['_sender']._host, 'remotehost');
            assert.strictEqual(process.serviceName, 'opentelemetry');
            assert.strictEqual(process.tags.length, 1);
            assert.strictEqual(process.tags[0].key, 'opentelemetry-exporter-jaeger');
            assert.strictEqual(process.tags[0].vType, 'STRING');
            assert.strictEqual(process.tags[0].vStr, '0.1.0');
        });
        it('should default to localhost if no host is configured', () => {
            const exporter = new src_1.JaegerExporter();
            const sender = exporter['_getSender']({
                tags: [{
                        key: 'service.name',
                        vStr: 'opentelemetry'
                    }]
            });
            assert.strictEqual(sender._host, 'localhost');
        });
        it('should respect jaeger host env variable', () => {
            process.env.OTEL_EXPORTER_JAEGER_AGENT_HOST = 'env-set-host';
            const exporter = new src_1.JaegerExporter();
            const sender = exporter['_getSender']({
                tags: [{
                        key: 'service.name',
                        vStr: 'opentelemetry'
                    }]
            });
            assert.strictEqual(sender._host, 'env-set-host');
        });
        it('should prioritize host option over env variable', () => {
            process.env.OTEL_EXPORTER_JAEGER_AGENT_HOST = 'env-set-host';
            const exporter = new src_1.JaegerExporter({
                host: 'option-set-host',
            });
            const sender = exporter['_getSender']({
                tags: [{
                        key: 'service.name',
                        vStr: 'opentelemetry'
                    }]
            });
            assert.strictEqual(sender._host, 'option-set-host');
        });
        it('should construct an exporter with flushTimeout', () => {
            const exporter = new src_1.JaegerExporter({
                flushTimeout: 5000,
            });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            assert.strictEqual(exporter['_onShutdownFlushTimeout'], 5000);
        });
        it('should construct an exporter without flushTimeout', () => {
            const exporter = new src_1.JaegerExporter();
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            assert.strictEqual(exporter['_onShutdownFlushTimeout'], 2000);
        });
    });
    describe('export', () => {
        let exporter;
        beforeEach(() => {
            exporter = new src_1.JaegerExporter();
        });
        afterEach(() => {
            exporter.shutdown();
        });
        it('should skip send with empty list', () => {
            exporter.export([], (result) => {
                assert.strictEqual(result.code, core_1.ExportResultCode.SUCCESS);
            });
        });
        it('should send spans to Jaeger backend and return with Success', () => {
            exporter.export([readableSpan], (result) => {
                assert.strictEqual(result.code, core_1.ExportResultCode.SUCCESS);
            });
        });
        it('should use httpSender if config.endpoint is set', done => {
            const mockedEndpoint = 'http://testendpoint';
            nock(mockedEndpoint)
                .post('/')
                .reply(function () {
                assert.strictEqual(this.req.headers['content-type'], 'application/x-thrift');
                assert.strictEqual(this.req.headers.host, 'testendpoint');
            });
            const exporter = new src_1.JaegerExporter({
                endpoint: mockedEndpoint,
            });
            exporter.export([readableSpan], () => {
                assert.strictEqual(exporter['_sender'].constructor.name, 'HTTPSender');
                done();
            });
        });
        it('should return failed export result on error', () => {
            nock.cleanAll();
            const expectedError = new Error('whoops');
            const mockedEndpoint = 'http://testendpoint';
            const scope = nock(mockedEndpoint)
                .post('/')
                .replyWithError(expectedError);
            const exporter = new src_1.JaegerExporter({
                endpoint: mockedEndpoint,
            });
            exporter.export([readableSpan], result => {
                var _a;
                scope.done();
                assert.strictEqual(result.code, core_1.ExportResultCode.FAILED);
                assert.ok((_a = result.error) === null || _a === void 0 ? void 0 : _a.message.includes(expectedError.message));
            });
        });
    });
});
//# sourceMappingURL=jaeger.test.js.map