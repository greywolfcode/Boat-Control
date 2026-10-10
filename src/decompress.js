const bytes = Uint8Array.fromBase64(_);

const dStream = new DecompressionStream("deflate-raw");
const stream = new Blob([bytes]).stream().pipeThrough(dStream);
const data = await new Response(stream).text();

eval(data);
