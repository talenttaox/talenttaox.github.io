import {generateMap} from './orbit-model.js';
self.onmessage=({data})=>{try{self.postMessage({map:generateMap(data)});}catch(error){self.postMessage({error:error.message});}};
