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
const utils_1 = require("../src/utils");
const nock = require("nock");
describe('JaegerExporter', () => {
    describe('constructor', () => {
        afterEach(() => {
            delete process.env.JAEGER_AGENT_HOST;
        });
        it('should construct an exporter', () => {
            const exporter = new src_1.JaegerExporter({ serviceName: 'opentelemetry' });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            const process = exporter['_sender']._process;
            assert.strictEqual(process.serviceName, 'opentelemetry');
            assert.strictEqual(process.tags.length, 0);
        });
        it('should construct an exporter with host, port, logger and tags', () => {
            const exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
                host: 'remotehost',
                port: 8080,
                logger: new core_1.NoopLogger(),
                tags: [{ key: 'opentelemetry-exporter-jaeger', value: '0.1.0' }],
            });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            const process = exporter['_sender']._process;
            assert.strictEqual(exporter['_sender']._host, 'remotehost');
            assert.strictEqual(process.serviceName, 'opentelemetry');
            assert.strictEqual(process.tags.length, 1);
            assert.strictEqual(process.tags[0].key, 'opentelemetry-exporter-jaeger');
            assert.strictEqual(process.tags[0].vType, 'STRING');
            assert.strictEqual(process.tags[0].vStr, '0.1.0');
        });
        it('should default to localhost if no host is configured', () => {
            const exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
            });
            assert.strictEqual(exporter['_sender']._host, 'localhost');
        });
        it('should respect jaeger host env variable', () => {
            process.env.JAEGER_AGENT_HOST = 'env-set-host';
            const exporter = new src_1.JaegerExporter({
                serviceName: 'test-service',
            });
            assert.strictEqual(exporter['_sender']._host, 'env-set-host');
        });
        it('should prioritize host option over env variable', () => {
            process.env.JAEGER_AGENT_HOST = 'env-set-host';
            const exporter = new src_1.JaegerExporter({
                serviceName: 'test-service',
                host: 'option-set-host',
            });
            assert.strictEqual(exporter['_sender']._host, 'option-set-host');
        });
        it('should construct an exporter with flushTimeout', () => {
            const exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
                flushTimeout: 5000,
            });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            assert.strictEqual(exporter['_onShutdownFlushTimeout'], 5000);
        });
        it('should construct an exporter without flushTimeout', () => {
            const exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
            });
            assert.ok(typeof exporter.export === 'function');
            assert.ok(typeof exporter.shutdown === 'function');
            assert.strictEqual(exporter['_onShutdownFlushTimeout'], 2000);
        });
    });
    describe('export', () => {
        let exporter;
        beforeEach(() => {
            exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
            });
        });
        afterEach(() => {
            exporter.shutdown();
        });
        it('should skip send with empty list', () => {
            exporter.export([], (result) => {
                assert.strictEqual(result, core_1.ExportResult.SUCCESS);
            });
        });
        it('should send spans to Jaeger backend and return with Success', () => {
            const spanContext = {
                traceId: 'd4cda95b652f4a1592b449d5929fda1b',
                spanId: '6e0c63257de34c92',
                traceFlags: api_1.TraceFlags.NONE,
            };
            const readableSpan = {
                name: 'my-span1',
                kind: api.SpanKind.CLIENT,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.CanonicalCode.DATA_LOSS,
                },
                attributes: {},
                links: [],
                events: [],
                duration: [32, 800000000],
                resource: resources_1.Resource.empty(),
                instrumentationLibrary: {
                    name: 'default',
                    version: '0.0.1',
                },
            };
            exporter.export([readableSpan], (result) => {
                assert.strictEqual(result, core_1.ExportResult.SUCCESS);
            });
        });
        it('should use httpSender if config.endpoint is setten and set x-opentelemetry-outgoing-request header', done => {
            const mockedEndpoint = 'http://testendpoint';
            nock(mockedEndpoint)
                .post('/')
                .reply(function () {
                assert.strictEqual(this.req.headers[utils_1.OT_REQUEST_HEADER], 1);
                assert.strictEqual(this.req.headers['content-type'], 'application/x-thrift');
                assert.strictEqual(this.req.headers.host, 'testendpoint');
                done();
            });
            const exporter = new src_1.JaegerExporter({
                serviceName: 'opentelemetry',
                endpoint: mockedEndpoint,
            });
            assert.strictEqual(exporter['_sender'].constructor.name, 'HTTPSender');
            assert.strictEqual(exporter['_sender']._httpOptions.headers[utils_1.OT_REQUEST_HEADER], 1);
            const spanContext = {
                traceId: 'd4cda95b652f4a1592b449d5929fda1b',
                spanId: '6e0c63257de34c92',
                traceFlags: api_1.TraceFlags.NONE,
            };
            const readableSpan = {
                name: 'my-span1',
                kind: api.SpanKind.CLIENT,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.CanonicalCode.DATA_LOSS,
                },
                attributes: {},
                links: [],
                events: [],
                duration: [32, 800000000],
                resource: resources_1.Resource.empty(),
                instrumentationLibrary: {
                    name: 'default',
                    version: '0.0.1',
                },
            };
            exporter.export([readableSpan], () => { });
        });
    });
});
//# sourceMappingURL=jaeger.test.js.map