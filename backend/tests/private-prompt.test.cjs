'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PassThrough}=require('node:stream');
const {createPrivatePrompt}=require('../scripts/private-prompt.cjs');
const {publicError}=require('../scripts/bootstrap-superadmin.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){const input=new PassThrough(),output=new PassThrough();input.isTTY=true;output.isTTY=true;input.setRawMode=()=>{};let transcript='';output.on('data',data=>transcript+=data.toString());const prompt=createPrivatePrompt(input,output);return {input,prompt,text:()=>transcript};}
test('terminal Windows: correo y dos contraseñas consecutivas, sin revelar las contraseñas',async()=>{
 const {input,prompt,text}=harness();
 try{
  const email=prompt.ask('Email: ');input.write('probe@example.test\r\n');assert.equal(await email,'probe@example.test');await tick();
  const first=prompt.ask('Contraseña (no se muestra): ',true);input.write('Synthetic-secret-2026!\r\n');assert.equal(await first,'Synthetic-secret-2026!');await tick();
  const second=prompt.ask('Repite la contraseña: ',true);input.write('Synthetic-secret-2026!\r\n');assert.equal(await second,'Synthetic-secret-2026!');await tick();
  assert.match(text(),/Contraseña \(no se muestra\): /);assert.match(text(),/Repite la contraseña: /);assert.doesNotMatch(text(),/Synthetic-secret/);
 }finally{prompt.close();input.end();}
});
test('Ctrl+C cancela la pregunta secreta sin imprimir lo escrito',async()=>{
 const {input,prompt,text}=harness();try{const answer=prompt.ask('Contraseña: ',true);const rejected=assert.rejects(answer,{code:'CLI_INPUT_CLOSED'});input.write('Never-show-this');input.write('\u0003');await rejected;assert.doesNotMatch(text(),/Never-show/);}finally{prompt.close();input.end();}
});
test('errores de validación son claros y errores SQL no revelan valores privados',()=>{
 assert.equal(publicError(Error('Las contraseñas no coinciden')),'Las contraseñas no coinciden');
 assert.match(publicError({code:'ECONNREFUSED'}),/conectar/);
 assert.doesNotMatch(publicError({code:'ER_INTERNAL',message:'SQL password_hash=private-test-value'}),/private-test-value|password_hash/);
});
