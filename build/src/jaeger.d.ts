import { ExportResult } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/tracing';
import * as jaegerTypes from './types';
/**
 * Format and sends span information to Jaeger Exporter.
 */
export declare class JaegerExporter implements SpanExporter {
    private readonly _logger;
    private readonly _process;
    private readonly _sender;
    private readonly _onShutdownFlushTimeout;
    constructor(config: jaegerTypes.ExporterConfig);
    /** Exports a list of spans to Jaeger. */
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
    /** Shutdown exporter. */
    shutdown(): void;
    /** Transform spans and sends to Jaeger service. */
    private _sendSpans;
    private _append;
    private _flush;
}
//# sourceMappingURL=jaeger.d.ts.map