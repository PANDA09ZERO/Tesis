const {fork,spawn}=require('node:child_process');const {pathToFileURL}=require('node:url');const path=require('node:path');
async function main(){
 if(process.env.NODE_ENV==='production')throw Error('Las pruebas E2E no se ejecutan en producción');
 // Solo el proceso aislado de pruebas permite los accesos repetidos de la suite.
 const fixture=fork(path.resolve('../backend/scripts/serve-integral-fixture.cjs'),[],{env:{...process.env,NODE_ENV:'test',FIXTURE_PORT:'4111',LOGIN_ACCOUNT_LIMIT:'200',LOGIN_IP_LIMIT:'1000'},stdio:['ignore','inherit','inherit','ipc']});
 let server;const closed=new Promise(resolve=>fixture.once('exit',(code,signal)=>resolve({code,signal})));
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Fixture no disponible')),30000);fixture.once('message',message=>{clearTimeout(timer);message.ready?resolve():reject(Error('Fixture inválido'));});fixture.once('exit',()=>{clearTimeout(timer);reject(Error('Fixture terminó antes de estar listo'));});});
  // Impide que un .env del desarrollador dirija las pruebas hacia una API real.
  process.env.VITE_API_BASE_URL='';
  process.env.VITE_API_PROXY_TARGET='http://127.0.0.1:4111';
  const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
  server=await createServer({server:{host:'127.0.0.1',port:5183,strictPort:true}});await server.listen();
  const runner=spawn(process.execPath,[require.resolve('@playwright/test/cli'),'test',...process.argv.slice(2)],{stdio:'inherit',env:process.env,windowsHide:true});
  process.exitCode=await new Promise((resolve,reject)=>{runner.once('error',reject);runner.once('exit',code=>resolve(code===0?0:1));});
 }finally{
  if(server)await server.close();
  if(fixture.connected)fixture.send({stop:true});
  let timer;try{const result=await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('No se confirmó limpieza del fixture')),15000);})]);if(result.code!==0)throw Error('El fixture terminó sin confirmar limpieza');}finally{clearTimeout(timer);}
 }
}
main().catch(error=>{console.error('E2E falló:',error.message);process.exitCode=1;});
