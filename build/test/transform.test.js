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
const transform_1 = require("../src/transform");
const resources_1 = require("@opentelemetry/resources");
const api = require("@opentelemetry/api");
const types_1 = require("../src/types");
const core_1 = require("@opentelemetry/core");
const api_1 = require("@opentelemetry/api");
describe('transform', () => {
    const spanContext = () => {
        return {
            traceId: 'd4cda95b652f4a1592b449d5929fda1b',
            spanId: '6e0c63257de34c92',
            traceFlags: api_1.TraceFlags.NONE,
        };
    };
    describe('spanToThrift', () => {
        it('should convert an OpenTelemetry span to a Thrift', () => {
            const readableSpan = {
                name: 'my-span',
                kind: api.SpanKind.INTERNAL,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.SpanStatusCode.OK,
                },
                attributes: {
                    testBool: true,
                    testString: 'test',
                    testNum: 3.142,
                },
                links: [
                    {
                        context: {
                            traceId: 'a4cda95b652f4a1592b449d5929fda1b',
                            spanId: '3e0c63257de34c92',
                            traceFlags: api_1.TraceFlags.SAMPLED,
                        },
                        attributes: {
                            testBool: true,
                            testString: 'test',
                            testNum: 3.142,
                        },
                    },
                ],
                events: [
                    {
                        name: 'something happened',
                        attributes: {
                            error: true,
                        },
                        time: [1566156729, 809],
                    },
                ],
                duration: [32, 800000000],
                resource: new resources_1.Resource({
                    service: 'ui',
                    version: 1,
                    cost: 112.12,
                }),
                instrumentationLibrary: {
                    name: 'default',
                    version: '0.0.1',
                },
            };
            const thriftSpan = transform_1.spanToThrift(readableSpan);
            const result = types_1.ThriftUtils._thrift.Span.rw.toBuffer(thriftSpan);
            assert.strictEqual(result.err, null);
            assert.deepStrictEqual(thriftSpan.operationName, 'my-span');
            assert.deepStrictEqual(thriftSpan.traceIdLow.toString('hex'), '92b449d5929fda1b');
            assert.deepStrictEqual(thriftSpan.traceIdHigh.toString('hex'), 'd4cda95b652f4a15');
            assert.deepStrictEqual(thriftSpan.spanId.toString('hex'), '6e0c63257de34c92');
            assert.deepStrictEqual(thriftSpan.parentSpanId, types_1.ThriftUtils.emptyBuffer);
            assert.deepStrictEqual(thriftSpan.flags, 1);
            assert.deepStrictEqual(thriftSpan.startTime, types_1.Utils.encodeInt64(core_1.hrTimeToMicroseconds(readableSpan.startTime)));
            assert.strictEqual(thriftSpan.tags.length, 9);
            const [tag1, tag2, tag3, tag4, tag5, tag6, tag7] = thriftSpan.tags;
            assert.strictEqual(tag1.key, 'testBool');
            assert.strictEqual(tag1.vType, 'BOOL');
            assert.strictEqual(tag1.vBool, true);
            assert.strictEqual(tag2.key, 'testString');
            assert.strictEqual(tag2.vType, 'STRING');
            assert.strictEqual(tag2.vStr, 'test');
            assert.strictEqual(tag3.key, 'testNum');
            assert.strictEqual(tag3.vType, 'DOUBLE');
            assert.strictEqual(tag3.vDouble, 3.142);
            assert.strictEqual(tag4.key, 'otel.status_code');
            assert.strictEqual(tag4.vType, 'STRING');
            assert.strictEqual(tag4.vStr, 'OK');
            assert.strictEqual(tag5.key, 'service');
            assert.strictEqual(tag5.vType, 'STRING');
            assert.strictEqual(tag5.vStr, 'ui');
            assert.strictEqual(tag6.key, 'version');
            assert.strictEqual(tag6.vType, 'DOUBLE');
            assert.strictEqual(tag6.vDouble, 1);
            assert.strictEqual(tag7.key, 'cost');
            assert.strictEqual(tag7.vType, 'DOUBLE');
            assert.strictEqual(tag7.vDouble, 112.12);
            assert.strictEqual(thriftSpan.references.length, 0);
            assert.strictEqual(thriftSpan.logs.length, 1);
            const [log1] = thriftSpan.logs;
            assert.strictEqual(log1.fields.length, 2);
            const [field1, field2] = log1.fields;
            assert.strictEqual(field1.key, 'event');
            assert.strictEqual(field1.vType, 'STRING');
            assert.strictEqual(field1.vStr, 'something happened');
            assert.strictEqual(field2.key, 'error');
            assert.strictEqual(field2.vType, 'BOOL');
            assert.strictEqual(field2.vBool, true);
        });
        it('should convert an OpenTelemetry span to a Thrift when links, events and attributes are empty', () => {
            const readableSpan = {
                name: 'my-span1',
                kind: api.SpanKind.CLIENT,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.SpanStatusCode.ERROR,
                    message: 'data loss',
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
            const thriftSpan = transform_1.spanToThrift(readableSpan);
            const result = types_1.ThriftUtils._thrift.Span.rw.toBuffer(thriftSpan);
            assert.strictEqual(result.err, null);
            assert.deepStrictEqual(thriftSpan.operationName, 'my-span1');
            assert.deepStrictEqual(thriftSpan.traceIdLow.toString('hex'), '92b449d5929fda1b');
            assert.deepStrictEqual(thriftSpan.traceIdHigh.toString('hex'), 'd4cda95b652f4a15');
            assert.deepStrictEqual(thriftSpan.spanId.toString('hex'), '6e0c63257de34c92');
            assert.deepStrictEqual(thriftSpan.parentSpanId, types_1.ThriftUtils.emptyBuffer);
            assert.deepStrictEqual(thriftSpan.flags, 1);
            assert.strictEqual(thriftSpan.references.length, 0);
            assert.strictEqual(thriftSpan.tags.length, 6);
            const [tag1, tag2, tag3, tag4] = thriftSpan.tags;
            assert.strictEqual(tag1.key, 'otel.status_code');
            assert.strictEqual(tag1.vType, 'STRING');
            assert.strictEqual(tag1.vStr, 'ERROR');
            assert.strictEqual(tag2.key, 'otel.status_description');
            assert.strictEqual(tag2.vType, 'STRING');
            assert.strictEqual(tag2.vStr, 'data loss');
            assert.strictEqual(tag3.key, 'error');
            assert.strictEqual(tag3.vType, 'BOOL');
            assert.strictEqual(tag3.vBool, true);
            assert.strictEqual(tag4.key, 'span.kind');
            assert.strictEqual(tag4.vType, 'STRING');
            assert.strictEqual(tag4.vStr, 'client');
            assert.strictEqual(thriftSpan.logs.length, 0);
        });
        it('should convert an OpenTelemetry span to a Thrift with ThriftReference', () => {
            const readableSpan = {
                name: 'my-span',
                kind: api.SpanKind.INTERNAL,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.SpanStatusCode.OK,
                },
                attributes: {},
                parentSpanId: '3e0c63257de34c92',
                links: [
                    {
                        context: {
                            traceId: 'a4cda95b652f4a1592b449d5929fda1b',
                            spanId: '3e0c63257de34c92',
                            traceFlags: api_1.TraceFlags.SAMPLED,
                        },
                    },
                ],
                events: [],
                duration: [32, 800000000],
                resource: resources_1.Resource.empty(),
                instrumentationLibrary: {
                    name: 'default',
                    version: '0.0.1',
                },
            };
            const thriftSpan = transform_1.spanToThrift(readableSpan);
            const result = types_1.ThriftUtils._thrift.Span.rw.toBuffer(thriftSpan);
            assert.strictEqual(result.err, null);
            assert.deepStrictEqual(thriftSpan.operationName, 'my-span');
            assert.deepStrictEqual(thriftSpan.parentSpanId.toString('hex'), '3e0c63257de34c92');
            assert.strictEqual(thriftSpan.references.length, 1);
            const [ref1] = thriftSpan.references;
            assert.strictEqual(ref1.traceIdLow.toString('hex'), '92b449d5929fda1b');
            assert.strictEqual(ref1.traceIdHigh.toString('hex'), 'a4cda95b652f4a15');
            assert.strictEqual(ref1.spanId.toString('hex'), '3e0c63257de34c92');
            assert.strictEqual(ref1.refType, types_1.ThriftReferenceType.FOLLOWS_FROM);
        });
        it('should left pad trace ids', () => {
            const readableSpan = {
                name: 'my-span1',
                kind: api.SpanKind.CLIENT,
                spanContext: () => {
                    return {
                        traceId: '92b449d5929fda1b',
                        spanId: '6e0c63257de34c92',
                        traceFlags: api_1.TraceFlags.NONE,
                    };
                },
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.SpanStatusCode.ERROR,
                    message: 'data loss',
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
            const thriftSpan = transform_1.spanToThrift(readableSpan);
            assert.strictEqual(thriftSpan.traceIdLow.toString('hex'), '92b449d5929fda1b');
            assert.strictEqual(thriftSpan.traceIdHigh.toString('hex'), '0000000000000000');
        });
        it('should set error flag only if span.status.code is ERROR', () => {
            const readableSpan = {
                name: 'my-span',
                kind: api.SpanKind.INTERNAL,
                spanContext,
                startTime: [1566156729, 709],
                endTime: [1566156731, 709],
                ended: true,
                status: {
                    code: api.SpanStatusCode.OK,
                },
                attributes: {
                    testBool: true,
                    testString: 'test',
                    testNum: 3.142,
                },
                links: [
                    {
                        context: {
                            traceId: 'a4cda95b652f4a1592b449d5929fda1b',
                            spanId: '3e0c63257de34c92',
                            traceFlags: api_1.TraceFlags.SAMPLED,
                        },
                        attributes: {
                            testBool: true,
                            testString: 'test',
                            testNum: 3.142,
                        },
                    },
                ],
                events: [
                    {
                        name: 'something happened',
                        attributes: {
                            error: true,
                        },
                        time: [1566156729, 809],
                    },
                ],
                duration: [32, 800000000],
                resource: new resources_1.Resource({
                    service: 'ui',
                    version: 1,
                    cost: 112.12,
                }),
                instrumentationLibrary: {
                    name: 'default',
                    version: '0.0.1',
                },
            };
            let thriftSpan = transform_1.spanToThrift(readableSpan);
            assert.strictEqual(thriftSpan.tags.find(tag => tag.key === 'error'), undefined, 'If span status OK, no error tag');
            readableSpan.status.code = api_1.SpanStatusCode.UNSET;
            thriftSpan = transform_1.spanToThrift(readableSpan);
            assert.strictEqual(thriftSpan.tags.find(tag => tag.key === 'error'), undefined, 'If span status USET, no error tag');
            readableSpan.status.code = api_1.SpanStatusCode.ERROR;
            thriftSpan = transform_1.spanToThrift(readableSpan);
            const errorTag = thriftSpan.tags.find(tag => tag.key === 'error');
            assert.strictEqual(errorTag === null || errorTag === void 0 ? void 0 : errorTag.vBool, true, 'If span status ERROR, error tag must be true');
        });
    });
});
//# sourceMappingURL=transform.test.js.map