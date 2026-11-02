const {spawnSync}=require('node:child_process');
for(const file of ['periodo-vigencia.test.cjs','profesores.test.cjs','profesores.integration.test.cjs','estudiantes.test.cjs','estudiantes.integration.test.cjs','payments.test.cjs','payments.integration.test.cjs','operations.test.cjs','asignaciones.integration.test.cjs','familia.test.cjs','integral.test.cjs','integral.integration.test.cjs','ai-removal.test.cjs','production.test.cjs','production.integration.test.cjs','private-prompt.test.cjs','superadmin.integration.test.cjs']){
 const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit',env:process.env,windowsHide:true});
 if(result.error||result.status!==0)process.exit(result.status||1);
}
