const { GoogleGenAI } = require("@google/genai");
console.log(Object.keys(new GoogleGenAI({apiKey: "123"})));
console.log(Object.keys(new GoogleGenAI({apiKey: "123"}).models || {}));
console.log(Object.keys(new GoogleGenAI({apiKey: "123"}).operations || {}));
