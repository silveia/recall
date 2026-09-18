/* the model runs in here, not on the page.

   a page of notes takes it a little while, and everything it does is
   arithmetic on the gpu with a lot of javascript around it — on the
   main thread that shows up as the page going stiff while you wait.
   in a worker the panel keeps answering and the count keeps climbing.

   web-llm ships the handler for this: it takes the messages the page
   sends, drives the engine, and posts the answers back. */
import * as webllm from './llm/web-llm.js';

const handler = new webllm.WebWorkerMLCEngineHandler();
self.onmessage = (event) => handler.onmessage(event);
