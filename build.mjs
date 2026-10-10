/*
    Build file from: https://github.com/hackclub/shrink

    MIT License

    Copyright (c) 2026 Hack Club, greywolfcode

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

// Turns src/index.html into one data URI. Run: node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { minify } from "terser";
import { deflateRawSync } from 'node:zlib';

const LIMIT = 3072;
const src = readFileSync("src/index.html", "utf8");
const decompress = readFileSync("src/decompress.js", "utf8");

// Squeeze whitespace in shaders written as glsl`...` (terser leaves strings alone).
function glsl(code) {
  return code
    .replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([-+*\/=<>(){}\[\];,!&|?:])\s*/g, "$1")
    .trim();
}
function compress(code)
{
  const bytes = new TextEncoder().encode(code);
  const compressed = deflateRawSync(bytes);
  return Buffer.from(compressed).toString('base64');
}

let html = "";
for (const part of src.split(/(<script>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>)/)) {
  if (part.startsWith("<script>")) {
    const js = part.slice(8, -9).replace(/glsl`([^`]*)`/g, (_, s) => JSON.stringify(glsl(s)));
    let { code } = await minify(js, { toplevel: true, compress: { passes: 3, booleans_as_integers: true, unsafe: true,}, mangle: {properties: true}});
    writeFileSync("node.txt", compress(code), 'utf8');

    code = 'let _=`' + compress(code) + '`;\n' + decompress;


    html += "<script type=\"module\">" + code + "</script>";
  } else if (part.startsWith("<style>")) {
    html += part
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};:,>])\s*/g, "$1")
      .replace(/;}/g, "}");
  } else {
    html += await part.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
  }
}

// Only these three break a data URI. Encoding anything else costs bytes for nothing.
const uri = "data:text/html," + html;//.replace(/\n/g, "%0A").replace(/#/g, "%23").replace(/%/g, "%25");

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/uri.txt", uri);

const bytes = Buffer.byteLength(uri);
console.log(bytes + " / " + LIMIT + " bytes, " + (bytes > LIMIT ? bytes - LIMIT + " over" : LIMIT - bytes + " left"));