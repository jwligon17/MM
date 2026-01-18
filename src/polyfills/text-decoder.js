// Lightweight TextDecoder polyfill to support utf-16le on Hermes.
const globalRef = typeof globalThis !== "undefined" ? globalThis : global;
const NativeTextDecoder = globalRef.TextDecoder;

const supportsUtf16 =
  typeof NativeTextDecoder !== "undefined" &&
  (() => {
    try {
      new NativeTextDecoder("utf-16le");
      return true;
    } catch {
      return false;
    }
  })();

const hasNativeDecoder = typeof NativeTextDecoder !== "undefined";

const utf8Decode = (input) => {
  const bytes =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input?.buffer || 0);

  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte1 = bytes[i];
    if ((byte1 & 0x80) === 0) {
      out += String.fromCharCode(byte1);
      continue;
    }

    if ((byte1 & 0xe0) === 0xc0) {
      const byte2 = bytes[++i] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
      continue;
    }

    if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = bytes[++i] & 0x3f;
      const byte3 = bytes[++i] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x0f) << 12) | (byte2 << 6) | byte3);
      continue;
    }

    const byte2 = bytes[++i] & 0x3f;
    const byte3 = bytes[++i] & 0x3f;
    const byte4 = bytes[++i] & 0x3f;
    const codepoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
    const adjusted = codepoint - 0x10000;
    out += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
  }

  return out;
};

if (!supportsUtf16) {
  class PatchedTextDecoder {
    constructor(label = "utf-8", options) {
      this.encoding = (label || "utf-8").toLowerCase();
      this.native =
        hasNativeDecoder && this.encoding !== "utf-16le" && this.encoding !== "utf16le"
          ? new NativeTextDecoder(label, options)
          : null;
    }

    decode(input, options) {
      if (this.encoding === "utf-16le" || this.encoding === "utf16le") {
        const view =
          input instanceof Uint8Array
            ? input
            : input instanceof ArrayBuffer
              ? new Uint8Array(input)
              : new Uint8Array(input?.buffer || 0);

        let result = "";
        for (let i = 0; i + 1 < view.length; i += 2) {
          result += String.fromCharCode(view[i] | (view[i + 1] << 8));
        }
        return result;
      }

      if (this.native) {
        return this.native.decode(input, options);
      }

      return utf8Decode(input);
    }
  }

  globalRef.TextDecoder = PatchedTextDecoder;
}
