import type { Readable } from "node:stream";

export function nodeReadableToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  let closed = false;
  let cleanup = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      cleanup = () => {
        nodeStream.off("data", onData);
        nodeStream.off("end", onEnd);
        nodeStream.off("error", onError);
        nodeStream.off("close", onClose);
      };

      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          nodeStream.destroy();
        }
      };

      const onData = (chunk: Buffer | string) => {
        if (closed) return;
        try {
          controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        } catch {
          closed = true;
          cleanup();
          nodeStream.destroy();
        }
      };

      const onEnd = () => close();
      const onClose = () => {
        if (!closed) close();
      };
      const onError = (error: Error) => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.error(error);
        } catch {
          nodeStream.destroy();
        }
      };

      nodeStream.on("data", onData);
      nodeStream.once("end", onEnd);
      nodeStream.once("error", onError);
      nodeStream.once("close", onClose);
    },
    cancel() {
      closed = true;
      cleanup();
      nodeStream.destroy();
    },
  });
}
