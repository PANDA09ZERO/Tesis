const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync(require.resolve('../devProxy.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exportsProxy={};vm.runInNewContext(compiled,{exports:exportsProxy,URL});
const {configureDevelopmentProxy}=exportsProxy;
function proxyOrigin(origin,host){
 let handler;const removed=[];
 configureDevelopmentProxy({on(event,callback){if(event==='proxyReq')handler=callback;}});
 handler({removeHeader:key=>removed.push(key)},{headers:{origin,host}});
 return removed;
}
test('el proxy local permite POST del móvil a su mismo origen LAN',()=>{
 for(const [origin,host]of [['http://192.168.1.20:5173','192.168.1.20:5173'],['http://localhost:5173','localhost:5173'],['http://[::1]:5173','[::1]:5173']])assert.deepEqual(proxyOrigin(origin,host),['origin']);
});
test('no oculta orígenes externos, puertos distintos, nulos ni malformados',()=>{
 for(const origin of ['https://ajeno.example','http://192.168.1.20:9000','null','bad','http://192.168.1.20:5173/','ftp://192.168.1.20:5173'])assert.deepEqual(proxyOrigin(origin,'192.168.1.20:5173'),[]);
 assert.deepEqual(proxyOrigin(undefined,'192.168.1.20:5173'),[]);
 assert.deepEqual(proxyOrigin('http://localhost:5173',undefined),[]);
});
