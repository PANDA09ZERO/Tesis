const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const net=require('node:net');const {pathToFileURL}=require('node:url');
test('Vite recibe el login móvil y mantiene bloqueados orígenes ajenos con el CORS real',async()=>{
 const previous={...process.env};let backend,vite;
 try{
  Object.assign(process.env,{NODE_ENV:'test',CORS_ORIGINS:'http://localhost:5173'});
  // Login sintético inexistente: nunca se escribe ni se toca la base instalada.
  const dbPath=require.resolve('../../backend/dist/config/database');require.cache[dbPath]={exports:{__esModule:true,default:{query:async()=>[[]]}}};
  const app=require('../../backend/dist/app').default;
  backend=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
  process.env.VITE_API_PROXY_TARGET='http://127.0.0.1:'+backend.address().port;
  const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
  const available=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
  vite=await createServer({server:{host:'127.0.0.1',port:available,strictPort:true},logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]}});await vite.listen();
  function login(port,origin,host='192.168.1.20:5173'){
   return new Promise((resolve,reject)=>{const request=http.request({host:'127.0.0.1',port,path:'/api/auth/login',method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json'}},response=>{let content='';response.on('data',chunk=>content+=chunk);response.on('end',()=>resolve({status:response.statusCode,body:JSON.parse(content)}));});request.setTimeout(5000,()=>request.destroy(Error('Tiempo de espera agotado')));request.on('error',reject);request.end(JSON.stringify({email:'missing@example.test',password:'Synthetic-only'}));});
  }
  assert.equal((await login(backend.address().port,'http://192.168.1.20:5173')).status,403);
  const proxied=await login(vite.httpServer.address().port,'http://192.168.1.20:5173');
  assert.equal(proxied.status,401);assert.equal(proxied.body.message,'Credenciales inválidas');
  assert.equal((await login(vite.httpServer.address().port,'https://ajeno.example')).status,403);
  const backendPort=backend.address().port;
  await new Promise(resolve=>backend.close(resolve));backend=undefined;
  const base='http://127.0.0.1:'+vite.httpServer.address().port;
  const unavailable=await fetch(base+'/api/auth/profile');
  assert.equal(unavailable.status,503);
  assert.equal(unavailable.headers.get('cache-control'),'no-store');
  const body=await unavailable.json();assert.equal(body.success,false);assert.equal(body.code,'DEV_BACKEND_UNAVAILABLE');assert.match(body.message,/backend local/);
  backend=await new Promise(resolve=>{const server=app.listen(backendPort,'127.0.0.1',()=>resolve(server));});
  assert.equal((await fetch(base+'/api/auth/profile')).status,401);

 }finally{
  if(vite)await vite.close();if(backend)await new Promise(resolve=>backend.close(resolve));
  for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);
 }
});
