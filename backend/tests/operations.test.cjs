'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {trackRequest,drainRequests}=require('../dist/utils/operations');
test('petición cerrada durante autorización no se ejecuta ni bloquea el mantenimiento',async()=>{
 for(const state of [{destroyed:true},{writableEnded:true}]){const res=Object.assign(new EventEmitter(),state);trackRequest(res,()=>assert.fail('No ejecutar sobre una conexión ya cerrada'));await drainRequests();}
});
test('finish y close de la misma respuesta liberan una sola solicitud',async()=>{
 const res=Object.assign(new EventEmitter(),{writableFinished:true});let called=0;trackRequest(res,()=>called++);res.emit('finish');res.emit('close');assert.equal(called,1);await drainRequests();
});
test('lectura cancelada después de iniciar no deja solicitudes activas',async()=>{
 const res=Object.assign(new EventEmitter(),{writableFinished:false});trackRequest(res,()=>{},false);res.emit('close');await drainRequests();
});
