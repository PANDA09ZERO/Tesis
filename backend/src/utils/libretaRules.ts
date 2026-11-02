export const categorias = ['practica', 'trabajo', 'examen'] as const;
export type Categoria = typeof categorias[number];
export interface LibretaPolicy {
 escala: 'numerica' | 'literal'; maxima: number; minima: number; decimales: number;
 pesos: Record<Categoria, number>; normalizar: boolean; excluir_historicas: boolean;
 recuperacion: 'mayor' | 'reemplazar' | 'promediar';
 categorias: Record<string, Categoria>; recuperaciones: Record<string, number>;
 niveles: { AD: number; A: number; B: number };
}
export const defaultPolicy: LibretaPolicy = {
 escala:'numerica', maxima:20, minima:11, decimales:1,
 pesos:{practica:30, trabajo:30, examen:40}, normalizar:false, excluir_historicas:false,
 recuperacion:'mayor', categorias:{}, recuperaciones:{}, niveles:{AD:17,A:14,B:11}
};
export function validatePolicy(value: unknown): string | null {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Configuración inválida';
 const p = value as LibretaPolicy;
 if (!['numerica','literal'].includes(p.escala) || typeof p.maxima!=='number' || !Number.isFinite(p.maxima) || p.maxima<=0 || p.maxima>100
  || typeof p.minima!=='number' || !Number.isFinite(p.minima) || p.minima<0 || p.minima>p.maxima
  || !Number.isInteger(p.decimales) || p.decimales<0 || p.decimales>2) return 'Revise escala, nota mínima y decimales';
 if (!p.pesos || categorias.some(c=>typeof p.pesos[c]!=='number' || !Number.isFinite(p.pesos[c]) || p.pesos[c]<0 || p.pesos[c]>100)
  || Math.abs(categorias.reduce((s,c)=>s+p.pesos[c],0)-100)>0.000001) return 'Las ponderaciones deben sumar 100 %';
 if (typeof p.normalizar!=='boolean' || typeof p.excluir_historicas!=='boolean' || !['mayor','reemplazar','promediar'].includes(p.recuperacion)) return 'Revise las reglas de conversión y recuperación';
 if (!p.niveles || ['AD','A','B'].some(k=>typeof p.niveles[k as keyof typeof p.niveles]!=='number' || !Number.isFinite(p.niveles[k as keyof typeof p.niveles]))
  || (p.escala==='literal' && !(p.maxima>=p.niveles.AD && p.niveles.AD>p.niveles.A && p.niveles.A>p.niveles.B && p.niveles.B>0))) return 'Los cortes literales deben cumplir: escala máxima ≥ AD > A > B > 0';
 for (const mapping of [p.categorias,p.recuperaciones]) if (!mapping || typeof mapping!=='object' || Array.isArray(mapping) || Object.keys(mapping).length>5000 || Object.keys(mapping).some(k=>!/^\d+$/.test(k) || Number(k)<=0)) return 'Asignaciones de evaluaciones inválidas';
 if (Object.values(p.categorias).some(c=>!categorias.includes(c))) return 'Categoría de evaluación inválida';
 if (Object.entries(p.recuperaciones).some(([id,target])=>!Number.isSafeInteger(target) || target<=0 || Number(id)===target || p.recuperaciones[String(target)]!==undefined)) return 'La recuperación debe apuntar a una evaluación original, sin ciclos';
 if (new Set(Object.values(p.recuperaciones)).size!==Object.values(p.recuperaciones).length) return 'Asigne una sola recuperación a cada evaluación original';
 return null;
}
export const inferredCategory = (tipo: string): Categoria | null => {
 const t=tipo.toLowerCase().trim();
 if (['practica','práctica'].includes(t)) return 'practica';
 if (['trabajo','proyecto'].includes(t)) return 'trabajo';
 if (['examen','examen_final'].includes(t)) return 'examen';
 return null;
};
interface AcademicData {
 alumno: any; matriculas: any[]; calificaciones: any[]; evaluaciones: any[];
}
export function calculateReport(data: AcademicData, periodoId: number, gradoId: number, p: LibretaPolicy) {
 const enrollment=data.matriculas.find(m=>Number(m.periodo_academico_id)===periodoId && Number(m.grado_id)===gradoId);
 const evaluations=data.evaluaciones.filter(e=>Number(e.periodo_id)===periodoId && Number(e.grado_id)===gradoId);
 const grades=data.calificaciones.filter(g=>Number(g.periodo_id)===periodoId && Number(g.grado_id)===gradoId);
 const courses=new Map<number,{id:number;nombre:string;estado:string|null}>();
 enrollment?.inscripciones.forEach((c:any)=>{if(c.curso_id)courses.set(Number(c.curso_id),{id:Number(c.curso_id),nombre:c.curso,estado:c.estado});});
 [...evaluations,...grades].forEach(e=>{if(!courses.has(Number(e.curso_id)))courses.set(Number(e.curso_id),{id:Number(e.curso_id),nombre:e.curso,estado:null});});
 const result=[...courses.values()].map(course=>{
  const issues:string[]=[];
  if(course.estado==='cancelada')return {...course,final:null,valor:null,condicion:'No aplica',pendientes:[],categorias:[]};
  if(!course.estado || course.estado==='pendiente')issues.push('La matrícula del curso requiere revisión');
  const evs=evaluations.filter(e=>Number(e.curso_id)===course.id);
  const legacy=grades.filter(g=>Number(g.curso_id)===course.id && !g.evaluacion_id);
  if(legacy.length && !p.excluir_historicas)issues.push('Hay notas históricas sin evaluación vinculada; revise su exclusión explícita');
  const values:Record<Categoria,number[]>={practica:[],trabajo:[],examen:[]};
  const gradeValue=(evaluation:any):number|null=>{
   const saved=grades.filter(g=>Number(g.evaluacion_id)===Number(evaluation.id));
   if(saved.length!==1){issues.push(saved.length?'Hay notas duplicadas en '+evaluation.nombre:'Falta la nota de '+evaluation.nombre);return null;}
   const n=Number(saved[0].nota),max=Number(evaluation.nota_maxima);
   if(saved[0].nota===null || !Number.isFinite(n) || !Number.isFinite(max) || max<=0 || n<0 || n>max){issues.push('Nota o escala inválida en '+evaluation.nombre);return null;}
   if(max!==p.maxima && !p.normalizar){issues.push('Debe autorizar la conversión de escala en '+evaluation.nombre);return null;}
   return n/max*p.maxima;
  };
  for(const e of evs){
   if(p.recuperaciones[String(e.id)]!==undefined)continue;
   const category=p.categorias[String(e.id)] || inferredCategory(e.tipo || '');
   if(!category){issues.push('Clasifique la evaluación '+e.nombre);continue;}
   if(p.pesos[category]===0)continue;
   const recovery=evs.find(r=>p.recuperaciones[String(r.id)]===Number(e.id));
   // A replacement may fill a missing original; the other modes require both marks.
   let n:number|null;
   if(recovery && p.recuperacion==='reemplazar')n=gradeValue(recovery);
   else {
    n=gradeValue(e);
    if(recovery){const r=gradeValue(recovery);if(n!==null && r!==null)n=p.recuperacion==='mayor'?Math.max(n,r):(n+r)/2;else n=null;}
   }
   if(n!==null)values[category].push(n);
  }
  const summaries=categorias.map(c=>{
   const list=values[c];
   if(p.pesos[c]>0 && !list.length)issues.push('Sin notas completas para '+c);
   return {categoria:c,peso:p.pesos[c],promedio:list.length?list.reduce((s,n)=>s+n,0)/list.length:null};
  });
  const raw=summaries.reduce((s,c)=>s+(c.promedio??0)*c.peso/100,0);
  const rounded=Math.round((raw+Number.EPSILON)*10**p.decimales)/10**p.decimales;
  const final=issues.length?null:rounded;
  const literal=final===null?null:final>=p.niveles.AD?'AD':final>=p.niveles.A?'A':final>=p.niveles.B?'B':'C';
  return {...course,final,valor:final===null?null:p.escala==='literal'?literal:final.toFixed(p.decimales),condicion:final===null?'Pendiente':final>=p.minima?'Aprobado':'Desaprobado',pendientes:[...new Set(issues)],categorias:summaries};
 });
 return {alumno:data.alumno,periodo_id:periodoId,grado_id:gradoId,periodo:enrollment?.periodo || evaluations[0]?.periodo || grades[0]?.periodo,grado:enrollment?.grado || evaluations[0]?.grado || grades[0]?.grado,
  cursos:result,listo:!!enrollment && result.some(c=>c.estado!=='cancelada') && result.every(c=>!c.pendientes.length),reglas:p};
}
