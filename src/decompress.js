const bytes = new Uint8Array(_.length);
for (let i=0; i<_.length; i++ )
{
    bytes[i] = _.charCodeAt(i)
}

const dStream = new DecompressionStream("deflate-raw");
const stream = response.body.pipeThrough(dStream);
const data = await new Response(decompressedStream).text();

eval(data);
