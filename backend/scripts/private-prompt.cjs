'use strict';
const readline=require('node:readline');
const {Writable}=require('node:stream');

// Solo APIs públicas: ocultar la salida del terminal, sin modificar métodos internos de readline.
function createPrivatePrompt(input=process.stdin,output=process.stdout){
 let muted=false,closed=false,pending;
 const sink=new Writable({write(chunk,encoding,callback){if(muted)callback();else output.write(chunk,encoding,callback);}});
 Object.defineProperty(sink,'columns',{get:()=>output.columns||80});
 const terminal=!!(input.isTTY&&output.isTTY);
 const rl=readline.createInterface({input,output:sink,terminal,crlfDelay:Infinity});
 rl.on('SIGINT',()=>rl.close());
 rl.on('close',()=>{closed=true;muted=false;if(pending){const reject=pending;pending=undefined;reject(Object.assign(new Error('Entrada cancelada o terminal cerrada'),{code:'CLI_INPUT_CLOSED'}));}});
 return {
  ask(text,secret=false){
   if(closed)return Promise.reject(Object.assign(new Error('Terminal cerrada'),{code:'CLI_INPUT_CLOSED'}));
   if(pending)return Promise.reject(Error('Ya hay una pregunta pendiente'));
   return new Promise((resolve,reject)=>{
    pending=reject;muted=secret;
    try{
     if(secret)output.write(text);
     rl.question(secret?'':text,value=>{pending=undefined;muted=false;if(secret)output.write('\n');resolve(value);});
    }catch(error){pending=undefined;muted=false;reject(error);}
   });
  },
  close(){rl.close();sink.end();}
 };
}
module.exports={createPrivatePrompt};
