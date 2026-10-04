// the model runs here, not on the page, so the panel keeps answering while it works
import * as webllm from './llm/web-llm.js';

const handler = new webllm.WebWorkerMLCEngineHandler();
self.onmessage = (event) => handler.onmessage(event);
