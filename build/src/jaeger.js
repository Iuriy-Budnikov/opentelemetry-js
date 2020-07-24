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
exports.JaegerExporter = void 0;
const core_1 = require("@opentelemetry/core");
const transform_1 = require("./transform");
const jaegerTypes = require("./types");
const utils_1 = require("./utils");
/**
 * Format and sends span information to Jaeger Exporter.
 */
class JaegerExporter {
    constructor(config) {
        const localConfig = Object.assign({}, config);
        this._logger = localConfig.logger || new core_1.NoopLogger();
        const tags = localConfig.tags || [];
        this._onShutdownFlushTimeout =
            typeof localConfig.flushTimeout === 'number'
                ? localConfig.flushTimeout
                : 2000;
        // https://github.com/jaegertracing/jaeger-client-node#environment-variables
        // By default, the client sends traces via UDP to the agent at localhost:6832. Use JAEGER_AGENT_HOST and
        // JAEGER_AGENT_PORT to send UDP traces to a different host:port. If JAEGER_ENDPOINT is set, the client sends traces
        // to the endpoint via HTTP, making the JAEGER_AGENT_HOST and JAEGER_AGENT_PORT unused. If JAEGER_ENDPOINT is secured,
        // HTTP basic authentication can be performed by setting the JAEGER_USER and JAEGER_PASSWORD environment variables.
        localConfig.endpoint = localConfig.endpoint || process.env.JAEGER_ENDPOINT;
        localConfig.username = localConfig.username || process.env.JAEGER_USER;
        localConfig.password = localConfig.password || process.env.JAEGER_PASSWORD;
        localConfig.host = localConfig.host || process.env.JAEGER_AGENT_HOST;
        if (localConfig.endpoint) {
            this._sender = new jaegerTypes.HTTPSender(localConfig);
            this._sender._httpOptions.headers[utils_1.OT_REQUEST_HEADER] = 1;
        }
        else {
            this._sender = localConfig.endpoint = new jaegerTypes.UDPSender(localConfig);
            this._sender._client.unref();
        }
        this._process = {
            serviceName: localConfig.serviceName,
            tags: jaegerTypes.ThriftUtils.getThriftTags(tags),
        };
        this._sender.setProcess(this._process);
    }
    /** Exports a list of spans to Jaeger. */
    export(spans, resultCallback) {
        if (spans.length === 0) {
            return resultCallback(core_1.ExportResult.SUCCESS);
        }
        this._logger.debug('Jaeger exporter export');
        this._sendSpans(spans, resultCallback).catch(err => {
            this._logger.error(`JaegerExporter failed to export: ${err}`);
        });
    }
    /** Shutdown exporter. */
    shutdown() {
        // Make an optimistic flush.
        this._flush();
        // Sleeping x seconds before closing the sender's connection to ensure
        // all spans are flushed.
        setTimeout(() => {
            this._sender.close();
        }, this._onShutdownFlushTimeout);
    }
    /** Transform spans and sends to Jaeger service. */
    async _sendSpans(spans, done) {
        const thriftSpan = spans.map(span => transform_1.spanToThrift(span));
        for (const span of thriftSpan) {
            try {
                await this._append(span);
            }
            catch (err) {
                this._logger.error(`failed to append span: ${err}`);
                // TODO right now we break out on first error, is that desirable?
                if (done)
                    return done(core_1.ExportResult.FAILED_NOT_RETRYABLE);
            }
        }
        this._logger.debug('successful append for : %s', thriftSpan.length);
        // Flush all spans on each export. No-op if span buffer is empty
        await this._flush();
        if (done)
            return done(core_1.ExportResult.SUCCESS);
    }
    async _append(span) {
        return new Promise((resolve, reject) => {
            this._sender.append(span, (count, err) => {
                if (err) {
                    return reject(new Error(err));
                }
                resolve(count);
            });
        });
    }
    async _flush() {
        await new Promise((resolve, reject) => {
            this._sender.flush((_count, err) => {
                if (err) {
                    return reject(new Error(err));
                }
                this._logger.debug('successful flush for %s spans', _count);
                resolve();
            });
        });
    }
}
exports.JaegerExporter = JaegerExporter;
//# sourceMappingURL=jaeger.js.map