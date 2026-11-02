// Los errores SQL pueden contener valores de usuarios, hashes y parámetros.
export function logError(context: string, ...details: unknown[]) {
  if(process.env.NODE_ENV!=='production')return console.error(context,...details);
  const error=details.find(value=>value instanceof Error) as (Error & {code?:string})|undefined;
  const code=typeof error?.code==='string'&&/^[A-Z0-9_]{1,50}$/.test(error.code)?error.code:undefined;
  console.error(JSON.stringify({event:'operation_failed',context,code}));
}
