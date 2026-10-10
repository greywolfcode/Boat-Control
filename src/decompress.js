_ = _.replaceAll("€", '"').replaceAll("—", "\n").replaceAll("–", "\r").replaceAll("π", "\\");
const bytes = Uint8Array.from(_, char => char.charCodeAt(0));

const dStream = new DecompressionStream("deflate-raw");
const stream = new Blob([bytes]).stream().pipeThrough(dStream);
const data = await new Response(stream).arrayBuffer();

eval(data);
